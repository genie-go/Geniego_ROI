# -*- coding: utf-8 -*-
"""Fix Audit.jsx missing closing tags"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = r'd:\project\GeniegoROI\frontend\src\pages\Audit.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Line 347 - missing </div> after hero-desc div
content = content.replace(
    '''            {t("audit.pageDesc")}
          </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>''',
    '''            {t("audit.pageDesc")}
          </div>
        </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>'''
)

# Fix 2: Line 370 - missing </div> after buttons row, and close hero
content = content.replace(
    '''      </div>

      {/* KPIs */}''',
    '''      </div>
        </div>
      </div>

      {/* KPIs */}'''
)

# Fix 3: Line 384 - KPI card missing </div> closings  
content = content.replace(
    '''            <div className="kpi-sub">{s}</div>
        ))}

      {/* Event Distribution + Risk Summary */}''',
    '''            <div className="kpi-sub">{s}</div>
          </div>
        ))}
      </div>

      {/* Event Distribution + Risk Summary */}'''
)

# Fix 4: Line 402-410 - action frequency bar missing closings
content = content.replace(
    '''                <span style={{ fontWeight: 700, color }}>{cnt}{t("audit.countUnit")}</span>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
                  <div style={{ width: `${(cnt / (logs.length || 1)) * 100}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s" }} />
              </div>
            

    </div>
  </div>
);
          })}
        </
div>''',
    '''                <span style={{ fontWeight: 700, color }}>{cnt}{t("audit.countUnit")}</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 4 }}>
                  <div style={{ width: `${(cnt / (logs.length || 1)) * 100}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.5s" }} />
                </div>
              </div>
            );
          })}
        </div>'''
)

# Fix 5: Line 435-448 - risk classification missing closings
content = content.replace(
    '''                </div>
              );
            })}
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>{t("audit.highRiskEvents")}</div>''',
    '''                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-3)", marginBottom: 8 }}>{t("audit.highRiskEvents")}</div>'''
)

# Fix 6: Line 445-449 - high risk events missing closings
content = content.replace(
    '''                  <span style={{ fontSize: 9, color: "var(--text-3)", marginLeft: "auto" }}>{timeAgo(l.at, t)}</span>
                <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.4 }}>{l.detail}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{t("audit.byActor")} {l.actor}</div>
            ))}
        </div>''',
    '''                  <span style={{ fontSize: 9, color: "var(--text-3)", marginLeft: "auto" }}>{timeAgo(l.at, t)}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.4 }}>{l.detail}</div>
                <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 3 }}>{t("audit.byActor")} {l.actor}</div>
              </div>
            ))}
          </div>
        </div>
      </div>'''
)

# Fix 7: Line 494 - filter bar missing closing div
content = content.replace(
    '''          )}
      </div>

      {/* Log view */}''',
    '''          )}
        </div>
      </div>

      {/* Log view */}'''
)

# Fix 8: Line 555-559 - missing closing divs for card and outer containers
content = content.replace(
    '''          </>
        )}

      {/* Usage Guide */}
      <UsageGuide t={t} />
    </div>
    </div>
  );
}''',
    '''          </>
        )}
      </div>

      {/* Usage Guide */}
      <UsageGuide t={t} />
    </div>
    </div>
    </div>
  );
}'''
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Audit.jsx fixed.')
