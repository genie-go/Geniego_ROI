<?php
declare(strict_types=1);

namespace Genie\Handlers;

use Genie\Db;
use Genie\TemplateResponder;
use PDO;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

/**
 * v419 Graph Scoring Handler
 *
 * Models a directed graph:   influencer → creative → sku → order
 *                            influencer → order  (direct, if known)
 *
 * Each edge has a weight (default 1.0, higher = stronger signal).
 * Node score = sum of normalized edge weights on all paths leading to it.
 *
 * Endpoints:
 *   POST /v419/graph/nodes            — upsert a node
 *   POST /v419/graph/edges            — upsert / update an edge + weight
 *   GET  /v419/graph/nodes            — list nodes (filterable by type)
 *   GET  /v419/graph/edges            — list edges
 *   GET  /v419/graph/score/influencer/{id}  — influencer contribution score
 *   GET  /v419/graph/score/sku/{sku}        — SKU attribution from upstream
 *   GET  /v419/graph/score/order/{id}       — order channel attribution graph
 *   GET  /v419/graph/summary                — top scorers per node type
 */
final class GraphScore {

    private static function tenantId(Request $request): string {
        $tid = $request->getHeaderLine('X-Tenant-Id');
        return $tid !== '' ? $tid : 'demo';
    }

    // ── Node management ───────────────────────────────────────────────────

    public static function upsertNode(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $type  = trim((string)($body['node_type'] ?? ''));
        $id    = trim((string)($body['node_id']   ?? ''));
        $label = trim((string)($body['label']     ?? ''));

        if ($type === '' || $id === '') {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'node_type and node_id required']);
        }

        $allowed = ['influencer', 'creative', 'sku', 'order'];
        if (!in_array($type, $allowed, true)) {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'node_type must be: ' . implode(', ', $allowed)]);
        }

        $extra = $body;
        foreach (['node_type', 'node_id', 'label'] as $k) unset($extra[$k]);

        $stmt = $pdo->prepare(
            'INSERT INTO graph_node(tenant_id,node_type,node_id,label,meta_json,created_at)
             VALUES(?,?,?,?,?,?)
             ON CONFLICT(tenant_id,node_type,node_id) DO UPDATE SET
               label=excluded.label, meta_json=excluded.meta_json'
        );
        $stmt->execute([$tenant, $type, $id, $label !== '' ? $label : $id, json_encode($extra, JSON_UNESCAPED_UNICODE), gmdate('c')]);

        return TemplateResponder::respond($response, ['ok' => true, 'node_type' => $type, 'node_id' => $id]);
    }

    public static function listNodes(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $q      = $request->getQueryParams();
        $type   = trim((string)($q['type'] ?? ''));

        if ($type !== '') {
            $stmt = $pdo->prepare('SELECT * FROM graph_node WHERE tenant_id=? AND node_type=? ORDER BY created_at DESC LIMIT 500');
            $stmt->execute([$tenant, $type]);
        } else {
            $stmt = $pdo->prepare('SELECT * FROM graph_node WHERE tenant_id=? ORDER BY node_type, created_at DESC LIMIT 500');
            $stmt->execute([$tenant]);
        }
        $nodes = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($nodes as &$n) {
            $n['meta'] = json_decode((string)($n['meta_json'] ?? '{}'), true);
            unset($n['meta_json']);
        }
        return TemplateResponder::respond($response, ['ok' => true, 'nodes' => $nodes]);
    }

    // ── Edge management ───────────────────────────────────────────────────

    public static function upsertEdge(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $body   = (array)($request->getParsedBody() ?? []);

        $srcType = trim((string)($body['src_type'] ?? ''));
        $srcId   = trim((string)($body['src_id']   ?? ''));
        $dstType = trim((string)($body['dst_type'] ?? ''));
        $dstId   = trim((string)($body['dst_id']   ?? ''));

        if ($srcType === '' || $srcId === '' || $dstType === '' || $dstId === '') {
            return TemplateResponder::respond($response->withStatus(422), ['error' => 'src_type, src_id, dst_type, dst_id required']);
        }

        $weight = isset($body['edge_weight']) ? (float)$body['edge_weight'] : 1.0;
        $label  = trim((string)($body['edge_label'] ?? ''));
        $extra  = $body;
        foreach (['src_type','src_id','dst_type','dst_id','edge_weight','edge_label'] as $k) unset($extra[$k]);

        // Auto-upsert nodes if they don't exist
        foreach ([[$srcType, $srcId], [$dstType, $dstId]] as [$t, $nid]) {
            $pdo->prepare(
                'INSERT OR IGNORE INTO graph_node(tenant_id,node_type,node_id,label,meta_json,created_at)
                 VALUES(?,?,?,?,?,?)'
            )->execute([$tenant, $t, $nid, $nid, '{}', gmdate('c')]);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO graph_edge(tenant_id,src_type,src_id,dst_type,dst_id,edge_weight,edge_label,meta_json,created_at)
             VALUES(?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $tenant, $srcType, $srcId, $dstType, $dstId,
            $weight, $label !== '' ? $label : null,
            json_encode($extra, JSON_UNESCAPED_UNICODE),
            gmdate('c'),
        ]);

        return TemplateResponder::respond($response, ['ok' => true, 'edge_id' => (int)$pdo->lastInsertId()]);
    }

    public static function listEdges(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $q      = $request->getQueryParams();
        $srcType = trim((string)($q['src_type'] ?? ''));

        if ($srcType !== '') {
            $stmt = $pdo->prepare('SELECT * FROM graph_edge WHERE tenant_id=? AND src_type=? ORDER BY created_at DESC LIMIT 500');
            $stmt->execute([$tenant, $srcType]);
        } else {
            $stmt = $pdo->prepare('SELECT * FROM graph_edge WHERE tenant_id=? ORDER BY created_at DESC LIMIT 500');
            $stmt->execute([$tenant]);
        }
        $edges = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($edges as &$e) {
            $e['meta'] = json_decode((string)($e['meta_json'] ?? '{}'), true);
            unset($e['meta_json']);
        }
        return TemplateResponder::respond($response, ['ok' => true, 'edges' => $edges]);
    }

    // ── Scoring ───────────────────────────────────────────────────────────

    /**
     * GET /v419/graph/score/influencer/{id}
     * How much does this influencer contribute to revenue via creatives → SKUs → orders?
     */
    public static function scoreInfluencer(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $infId  = (string)($args['id'] ?? '');

        // Hop 1: influencer → creative
        $h1 = $pdo->prepare('SELECT dst_id AS creative_id, SUM(edge_weight) AS w FROM graph_edge WHERE tenant_id=? AND src_type=\'influencer\' AND src_id=? AND dst_type=\'creative\' GROUP BY dst_id');
        $h1->execute([$tenant, $infId]);
        $creatives = $h1->fetchAll(PDO::FETCH_ASSOC);

        $paths    = [];
        $totalW   = 0.0;
        $skuSet   = [];
        $orderSet = [];

        foreach ($creatives as $c) {
            $cid = (string)$c['creative_id'];
            $cw  = (float)$c['w'];

            // Hop 2: creative → sku
            $h2 = $pdo->prepare('SELECT dst_id AS sku, SUM(edge_weight) AS w FROM graph_edge WHERE tenant_id=? AND src_type=\'creative\' AND src_id=? AND dst_type=\'sku\' GROUP BY dst_id');
            $h2->execute([$tenant, $cid]);
            $skus = $h2->fetchAll(PDO::FETCH_ASSOC);

            foreach ($skus as $s) {
                $sku = (string)$s['sku'];
                $sw  = $cw * (float)$s['w'];
                $skuSet[$sku] = ($skuSet[$sku] ?? 0.0) + $sw;

                // Hop 3: sku → order
                $h3 = $pdo->prepare('SELECT dst_id AS order_id, SUM(edge_weight) AS w FROM graph_edge WHERE tenant_id=? AND src_type=\'sku\' AND src_id=? AND dst_type=\'order\' GROUP BY dst_id');
                $h3->execute([$tenant, $sku]);
                $orders = $h3->fetchAll(PDO::FETCH_ASSOC);

                foreach ($orders as $o) {
                    $oid = (string)$o['order_id'];
                    $ow  = $sw * (float)$o['w'];
                    $orderSet[$oid] = ($orderSet[$oid] ?? 0.0) + $ow;
                    $totalW += $ow;
                    $paths[] = ['influencer' => $infId, 'creative' => $cid, 'sku' => $sku, 'order' => $oid, 'path_weight' => round($ow, 4)];
                }
            }
        }

        // Direct edges: influencer → order
        $direct = $pdo->prepare('SELECT dst_id AS order_id, SUM(edge_weight) AS w FROM graph_edge WHERE tenant_id=? AND src_type=\'influencer\' AND src_id=? AND dst_type=\'order\' GROUP BY dst_id');
        $direct->execute([$tenant, $infId]);
        foreach ($direct->fetchAll(PDO::FETCH_ASSOC) as $o) {
            $oid = (string)$o['order_id'];
            $ow  = (float)$o['w'];
            $orderSet[$oid] = ($orderSet[$oid] ?? 0.0) + $ow;
            $totalW += $ow;
            $paths[] = ['influencer' => $infId, 'creative' => null, 'sku' => null, 'order' => $oid, 'path_weight' => round($ow, 4), 'note' => 'direct'];
        }

        // Normalize score
        $maxW  = $totalW > 0 ? $totalW : 1.0;
        $score = round(min(1.0, $totalW / max(1.0, count($orderSet) * 2.0)), 4);

        return TemplateResponder::respond($response, [
            'ok'           => true,
            'influencer_id' => $infId,
            'graph_score'  => $score,
            'total_weight' => round($totalW, 4),
            'creatives'    => array_keys(array_column($creatives, null, 'creative_id')),
            'skus_reached' => array_map(fn($k,$v) => ['sku'=>$k,'weight'=>round($v,4)], array_keys($skuSet), $skuSet),
            'orders_reached' => array_map(fn($k,$v) => ['order_id'=>$k,'weight'=>round($v,4)], array_keys($orderSet), $orderSet),
            'paths'        => $paths,
        ]);
    }

    /**
     * GET /v419/graph/score/sku/{sku}
     * Which influencers/creatives drive this SKU and with what weight?
     */
    public static function scoreSku(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $sku    = (string)($args['sku'] ?? '');

        // Upstream: creative → this sku
        $up1 = $pdo->prepare('SELECT src_id AS creative_id, SUM(edge_weight) AS w FROM graph_edge WHERE tenant_id=? AND dst_type=\'sku\' AND dst_id=? AND src_type=\'creative\' GROUP BY src_id');
        $up1->execute([$tenant, $sku]);
        $creatives = $up1->fetchAll(PDO::FETCH_ASSOC);

        $infScores = [];
        foreach ($creatives as $c) {
            $cid = (string)$c['creative_id'];
            $cw  = (float)$c['w'];
            // influencer → creative
            $up2 = $pdo->prepare('SELECT src_id AS inf_id, SUM(edge_weight) AS w FROM graph_edge WHERE tenant_id=? AND src_type=\'influencer\' AND dst_type=\'creative\' AND dst_id=? GROUP BY src_id');
            $up2->execute([$tenant, $cid]);
            foreach ($up2->fetchAll(PDO::FETCH_ASSOC) as $inf) {
                $iid = (string)$inf['inf_id'];
                $iw  = $cw * (float)$inf['w'];
                $infScores[$iid] = ($infScores[$iid] ?? 0.0) + $iw;
            }
        }

        // Downstream: sku → order
        $dn = $pdo->prepare('SELECT dst_id AS order_id, SUM(edge_weight) AS w FROM graph_edge WHERE tenant_id=? AND src_type=\'sku\' AND src_id=? AND dst_type=\'order\' GROUP BY dst_id');
        $dn->execute([$tenant, $sku]);
        $orders = $dn->fetchAll(PDO::FETCH_ASSOC);

        arsort($infScores);
        $topInfluencers = array_map(
            fn($iid, $iw) => ['influencer_id' => $iid, 'contribution_weight' => round($iw, 4)],
            array_keys($infScores), $infScores
        );

        return TemplateResponder::respond($response, [
            'ok'              => true,
            'sku'             => $sku,
            'top_influencers' => array_slice($topInfluencers, 0, 20),
            'creatives_used'  => count($creatives),
            'orders_linked'   => count($orders),
            'orders'          => array_map(fn($o) => ['order_id' => $o['order_id'], 'weight' => round((float)$o['w'], 4)], $orders),
        ]);
    }

    /**
     * GET /v419/graph/score/order/{id}
     * Full upstream attribution graph for a given order.
     */
    public static function scoreOrder(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);
        $orderId = (string)($args['id'] ?? '');

        $chains = [];

        // sku → order ← current order
        $skuEdges = $pdo->prepare('SELECT src_id AS sku, edge_weight FROM graph_edge WHERE tenant_id=? AND dst_type=\'order\' AND dst_id=? AND src_type=\'sku\'');
        $skuEdges->execute([$tenant, $orderId]);
        foreach ($skuEdges->fetchAll(PDO::FETCH_ASSOC) as $se) {
            $sku  = (string)$se['sku'];
            $sw   = (float)$se['edge_weight'];

            $creEdges = $pdo->prepare('SELECT src_id AS creative_id, edge_weight FROM graph_edge WHERE tenant_id=? AND dst_type=\'sku\' AND dst_id=? AND src_type=\'creative\'');
            $creEdges->execute([$tenant, $sku]);
            foreach ($creEdges->fetchAll(PDO::FETCH_ASSOC) as $ce) {
                $cid = (string)$ce['creative_id'];
                $cw  = $sw * (float)$ce['edge_weight'];

                $infEdges = $pdo->prepare('SELECT src_id AS inf_id, edge_weight FROM graph_edge WHERE tenant_id=? AND dst_type=\'creative\' AND dst_id=? AND src_type=\'influencer\'');
                $infEdges->execute([$tenant, $cid]);
                foreach ($infEdges->fetchAll(PDO::FETCH_ASSOC) as $ie) {
                    $iid = (string)$ie['inf_id'];
                    $iw  = $cw * (float)$ie['edge_weight'];
                    $chains[] = ['influencer' => $iid, 'creative' => $cid, 'sku' => $sku, 'order' => $orderId, 'chain_weight' => round($iw, 4)];
                }
                if (empty($chains)) {
                    $chains[] = ['influencer' => null, 'creative' => $cid, 'sku' => $sku, 'order' => $orderId, 'chain_weight' => round($cw, 4)];
                }
            }
            if (empty($chains)) {
                $chains[] = ['influencer' => null, 'creative' => null, 'sku' => $sku, 'order' => $orderId, 'chain_weight' => round($sw, 4)];
            }
        }

        // Direct: influencer → order
        $directInf = $pdo->prepare('SELECT src_id AS inf_id, edge_weight FROM graph_edge WHERE tenant_id=? AND dst_type=\'order\' AND dst_id=? AND src_type=\'influencer\'');
        $directInf->execute([$tenant, $orderId]);
        foreach ($directInf->fetchAll(PDO::FETCH_ASSOC) as $di) {
            $chains[] = ['influencer' => $di['inf_id'], 'creative' => null, 'sku' => null, 'order' => $orderId, 'chain_weight' => round((float)$di['edge_weight'], 4), 'note' => 'direct'];
        }

        $totalWeight = array_sum(array_column($chains, 'chain_weight'));
        // Normalize confidence 0-1
        $confidence = round(min(1.0, $totalWeight > 0 ? $totalWeight / max(1.0, count($chains)) : 0.0), 4);

        return TemplateResponder::respond($response, [
            'ok'          => true,
            'order_id'    => $orderId,
            'confidence'  => $confidence,
            'total_chain_weight' => round($totalWeight, 4),
            'chains'      => $chains,
        ]);
    }

    /**
     * GET /v419/graph/summary
     * Top scorers per node type.
     */
    public static function summary(Request $request, Response $response, array $args): Response {
        $pdo    = Db::pdo();
        $tenant = self::tenantId($request);

        // Top influencers by outgoing edge weight
        $inf = $pdo->prepare('SELECT src_id AS id, SUM(edge_weight) AS total_weight, COUNT(*) AS edge_count FROM graph_edge WHERE tenant_id=? AND src_type=\'influencer\' GROUP BY src_id ORDER BY total_weight DESC LIMIT 20');
        $inf->execute([$tenant]);

        // Top creatives
        $cre = $pdo->prepare('SELECT src_id AS id, SUM(edge_weight) AS total_weight, COUNT(*) AS edge_count FROM graph_edge WHERE tenant_id=? AND src_type=\'creative\' GROUP BY src_id ORDER BY total_weight DESC LIMIT 20');
        $cre->execute([$tenant]);

        // Top SKUs by inbound weight
        $sku = $pdo->prepare('SELECT dst_id AS id, SUM(edge_weight) AS total_weight, COUNT(*) AS edge_count FROM graph_edge WHERE tenant_id=? AND dst_type=\'sku\' GROUP BY dst_id ORDER BY total_weight DESC LIMIT 20');
        $sku->execute([$tenant]);

        // Node counts
        $cnt = $pdo->prepare('SELECT node_type, COUNT(*) AS cnt FROM graph_node WHERE tenant_id=? GROUP BY node_type');
        $cnt->execute([$tenant]);

        $edgeCnt = (int)$pdo->prepare('SELECT COUNT(*) FROM graph_edge WHERE tenant_id=?')->execute([$tenant]);

        $edgeTotal = $pdo->prepare('SELECT COUNT(*) FROM graph_edge WHERE tenant_id=?');
        $edgeTotal->execute([$tenant]);

        return TemplateResponder::respond($response, [
            'ok'               => true,
            'node_counts'      => $cnt->fetchAll(PDO::FETCH_ASSOC),
            'total_edges'      => (int)$edgeTotal->fetchColumn(),
            'top_influencers'  => $inf->fetchAll(PDO::FETCH_ASSOC),
            'top_creatives'    => $cre->fetchAll(PDO::FETCH_ASSOC),
            'top_skus'         => $sku->fetchAll(PDO::FETCH_ASSOC),
        ]);
    }
}
