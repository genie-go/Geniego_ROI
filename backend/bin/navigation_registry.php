<?php
declare(strict_types=1);

/**
 * [CWIS Part004-02] Navigation Registry CLI — 명세 §55 `php artisan collaboration:navigation:*` 의 적응 구현.
 *
 * ★교차검증: 본 저장소에 artisan/Symfony Console 이 없다(실측 — artisan 파일 부재, bin/*.php 는 순수 PHP).
 *   기존 관례(backend/bin/*.php)에 맞춰 동일 목적을 순수 PHP CLI 로 제공한다.
 *
 * 사용:
 *   php backend/bin/navigation_registry.php status
 *   php backend/bin/navigation_registry.php validate [--fail-on-critical]
 *   php backend/bin/navigation_registry.php aliases:validate
 *   php backend/bin/navigation_registry.php resolve --plan=pro [--principal=USER] [--platform=WEB_DESKTOP]
 *   php backend/bin/navigation_registry.php shadow-compare
 *   php backend/bin/navigation_registry.php selftest
 *
 * ★DB 를 필요로 하지 않는다(레지스트리 스냅샷 + 순수 Resolver 만 사용) — 로컬에서 운영 DB 없이 검증 가능.
 * 종료코드: 0=정상, 1=검증 실패, 2=스냅샷 부재/손상.
 */

require_once __DIR__ . '/../vendor/autoload.php';

use Genie\Handlers\PM\Navigation;

$argvv = $argv;
array_shift($argvv);
$cmd = $argvv[0] ?? 'status';
$opt = static function (string $name, ?string $def = null) use ($argvv): ?string {
    foreach ($argvv as $a) {
        if ($a === "--$name") return '1';
        if (str_starts_with($a, "--$name=")) return substr($a, strlen($name) + 3);
    }
    return $def;
};

$REGISTRY_PATH = __DIR__ . '/../data/navigation_registry.json';

function loadRegistryOrDie(string $path): array
{
    if (!is_file($path)) {
        fwrite(STDERR, "[nav-registry] 스냅샷 부재: $path\n  생성: node tools/navigation_registry_build.mjs\n");
        exit(2);
    }
    $data = json_decode((string)file_get_contents($path), true);
    if (!is_array($data) || !isset($data['items'])) {
        fwrite(STDERR, "[nav-registry] 스냅샷 손상\n");
        exit(2);
    }
    return $data;
}

/* ══════════════════════════════════════════════════════════════════════════ */

switch ($cmd) {

    case 'status': {
        $reg = loadRegistryOrDie($REGISTRY_PATH);
        $c = $reg['validation']['counts'] ?? [];
        printf("registry_version : %s\n", $reg['registry_version'] ?? '-');
        printf("source_revision  : %s\n", $reg['source_revision'] ?? '-');
        printf("generated_at     : %s\n", $reg['generated_at'] ?? '-');
        printf("activatable      : %s\n", ($reg['activatable'] ?? false) ? 'yes' : 'NO (활성화 차단)');
        printf("items / aliases  : %d / %d\n", count($reg['items']), count($reg['aliases'] ?? []));
        printf("validation       : CRITICAL=%d ERROR=%d WARNING=%d INFO=%d\n",
            $c['CRITICAL'] ?? 0, $c['ERROR'] ?? 0, $c['WARNING'] ?? 0, $c['INFO'] ?? 0);
        $byStatus = [];
        foreach ($reg['items'] as $i) { $byStatus[$i['status']] = ($byStatus[$i['status']] ?? 0) + 1; }
        printf("by_status        : %s\n", json_encode($byStatus, JSON_UNESCAPED_UNICODE));
        exit(0);
    }

    case 'validate': {
        $reg = loadRegistryOrDie($REGISTRY_PATH);
        $issues = $reg['validation']['issues'] ?? [];
        // 런타임 재검증 — 스냅샷 신뢰하지 않고 Navigation 이 실제 강제하는 규칙을 다시 돌린다.
        $byKey = [];
        foreach ($reg['items'] as $i) $byKey[$i['menu_key']] = $i;
        $runtime = [];
        foreach ($reg['items'] as $i) {
            $k = (string)$i['menu_key'];
            if (!preg_match('/^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$/', $k)) $runtime[] = ['CRITICAL', 'INVALID_MENU_KEY', $k];
            if (!empty($i['parent_menu_key']) && !isset($byKey[$i['parent_menu_key']])) $runtime[] = ['CRITICAL', 'ORPHAN_PARENT', $k];
            if (($i['context_scope'] ?? '') === 'ADMINISTRATION' && empty($i['permission_rule'])) $runtime[] = ['CRITICAL', 'ADMIN_SCOPE_WITHOUT_PERMISSION', $k];
            foreach (['AI_AGENT', 'SERVICE_ACCOUNT'] as $np) {
                if (in_array($np, (array)($i['target_principal_types'] ?? []), true)) $runtime[] = ['CRITICAL', 'NON_HUMAN_UI_TARGET', $k];
            }
            foreach (Navigation::validatePolicy($i['visibility_policy'] ?? null) as $e) {
                $runtime[] = ['CRITICAL', 'INVALID_VISIBILITY_POLICY', "$k: $e"];
            }
        }
        $crit = 0;
        foreach ($issues as $i) {
            printf("  %-8s %-32s %s\n", $i['severity'], $i['code'], $i['target']);
            if (($i['severity'] ?? '') === 'CRITICAL') $crit++;
        }
        // 런타임 검사는 전부 CRITICAL 등급으로만 수집한다(위 push 참조) — 발견 즉시 활성화 차단 대상.
        foreach ($runtime as $r) {
            printf("  %-8s %-32s %s  (runtime)\n", $r[0], $r[1], $r[2]);
            $crit++;
        }
        printf("[nav-registry] build issues=%d · runtime issues=%d · CRITICAL=%d\n", count($issues), count($runtime), $crit);
        exit(($opt('fail-on-critical') && $crit > 0) ? 1 : 0);
    }

    case 'aliases:validate': {
        $reg = loadRegistryOrDie($REGISTRY_PATH);
        $keys = array_column($reg['items'], 'menu_key');
        $aliasKeys = [];
        $bad = 0;
        foreach ($reg['aliases'] ?? [] as $a) {
            $ak = (string)$a['alias_key'];
            if (isset($aliasKeys[$ak])) { printf("  DUPLICATE_ALIAS  %s\n", $ak); $bad++; }
            $aliasKeys[$ak] = true;
            if (($a['status'] ?? '') !== 'ACTIVE') continue;
            if (empty($a['target_menu_key'])) { printf("  ALIAS_NO_TARGET  %s\n", $ak); $bad++; continue; }
            if (!in_array($a['target_menu_key'], $keys, true)) { printf("  ALIAS_TARGET_MISSING  %s → %s\n", $ak, $a['target_menu_key']); $bad++; }
            if (isset($aliasKeys[(string)$a['target_menu_key']])) { printf("  ALIAS_CHAIN  %s\n", $ak); $bad++; }
        }
        printf("[nav-registry] aliases=%d · 문제=%d\n", count($reg['aliases'] ?? []), $bad);
        exit($bad > 0 ? 1 : 0);
    }

    case 'resolve': {
        $reg = loadRegistryOrDie($REGISTRY_PATH);
        $ctx = [
            'tenant_id' => 'cli', 'principal_type' => strtoupper($opt('principal', 'USER')),
            'principal_id' => 'cli', 'plan' => strtolower($opt('plan', 'pro')),
            'platform' => strtoupper($opt('platform', 'WEB_DESKTOP')), 'locale' => 'ko',
            'workspace_id' => null, 'project_id' => null, 'membership_status' => 'ACTIVE',
            'capabilities' => ['collaboration.foundation' => true], 'feature_flags' => null,
        ];
        $res = Navigation::resolve($reg, $ctx, []);
        $print = function (array $nodes, int $d = 0) use (&$print): void {
            foreach ($nodes as $n) {
                printf("%s%s  [%s] %s\n", str_repeat('  ', $d), $n['menu_key'], $n['state'],
                    $n['target']['route_name'] ?? '');
                $print($n['children'] ?? [], $d + 1);
            }
        };
        $print($res['tree']);
        printf("[nav-registry] plan=%s principal=%s platform=%s → visible=%d / total=%d\n",
            $ctx['plan'], $ctx['principal_type'], $ctx['platform'], $res['stats']['visible'], $res['stats']['total']);
        exit(0);
    }

    case 'shadow-compare': {
        $reg = loadRegistryOrDie($REGISTRY_PATH);
        $bad = 0;
        foreach (['free', 'starter', 'growth', 'pro', 'enterprise', 'admin'] as $plan) {
            $legacy = [];
            foreach ($reg['items'] as $it) {
                if (($it['type'] ?? '') !== 'ITEM') continue;
                if (($it['legacy']['audience'] ?? '') === 'ADMIN' && $plan !== 'admin') continue;
                if (!Navigation::hasMenuAccess($plan, $it, [])) continue;
                $legacy[] = (string)$it['menu_key'];
            }
            $res = Navigation::resolve($reg, [
                'tenant_id' => 'cli', 'principal_type' => 'USER', 'principal_id' => 'cli', 'plan' => $plan,
                'platform' => 'WEB_DESKTOP', 'locale' => 'ko', 'membership_status' => 'ACTIVE',
                'capabilities' => ['collaboration.foundation' => true], 'feature_flags' => null,
            ], []);
            $flat = [];
            $walk = function (array $ns) use (&$walk, &$flat): void {
                foreach ($ns as $n) { if (($n['type'] ?? '') === 'ITEM') $flat[] = $n['menu_key']; $walk($n['children'] ?? []); }
            };
            $walk($res['tree']);
            sort($legacy); sort($flat);
            $missing = array_values(array_diff($legacy, $flat));
            $extra = array_values(array_diff($flat, $legacy));
            $ok = !$missing && !$extra;
            if (!$ok) $bad++;
            printf("%-11s legacy=%-3d registry=%-3d %s\n", $plan, count($legacy), count($flat), $ok ? 'IDENTICAL' : 'DIFF');
            if ($missing) printf("    missing_in_registry: %s\n", implode(', ', array_slice($missing, 0, 10)));
            if ($extra) printf("    extra_in_registry  : %s\n", implode(', ', array_slice($extra, 0, 10)));
        }
        printf("[nav-registry] shadow-compare 차이 플랜=%d\n", $bad);
        exit(0);
    }

    case 'selftest': {
        require __DIR__ . '/navigation_registry_selftest.php';
        exit(0);
    }

    default:
        fwrite(STDERR, "알 수 없는 명령: $cmd\n사용: status | validate | aliases:validate | resolve | shadow-compare | selftest\n");
        exit(2);
}
