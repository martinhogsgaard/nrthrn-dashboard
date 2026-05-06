import { KpiCard, SecLabel, Card } from '@/components/ui'

export default function OverviewPage() {
  return (
    <div>
      <SecLabel>Overblik — maj 2026</SecLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 32, borderTop: '3px solid #6b5ca5' }}>
          <div style={{ fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 8 }}>Månedlig omsætning</div>
          <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 56, fontWeight: 700, color: '#1a1520', lineHeight: 1 }}>198.200 kr.</div>
          <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 8 }}>Kontingenter + klipkort + sauna + drop-in ekskl. moms</div>
          <div style={{ display: 'inline-block', marginTop: 12, padding: '5px 14px', borderRadius: 20, background: '#e8f5ef', color: '#2e8b6a', border: '1px solid #b0d8c4', fontSize: 12, fontWeight: 500 }}>↑ 7,8% vs. april 2026</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 20, flex: 1 }}>
            <div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 6 }}>Moms at afregne</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 36, fontWeight: 700, color: '#1a1520' }}>30.607 kr.</div>
            <div style={{ fontSize: 10, color: '#8a85a0', marginTop: 4 }}>Hold-moms + øvrig moms</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid #e4e0f0', borderRadius: 10, padding: 20, flex: 1 }}>
            <div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: '#8a85a0', fontWeight: 600, marginBottom: 6 }}>Samlede lønomk.</div>
            <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 36, fontWeight: 700, color: '#1a1520' }}>Beregnes →</div>
            <div style={{ fontSize: 10, color: '#8a85a0', marginTop: 4 }}>Fra instruktør-lønfanen</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <KpiCard label="Aktive medlemmer" value="412" sub="↑ 18 nye denne måned" subColor="green" />
        <KpiCard label="Kontingentindtægt (MRR)" value="182.400 kr." sub="Løbende månedlige abonnementer" />
        <KpiCard label="Belægning på hold" value="74%" sub="↑ 3% fra april" subColor="green" />
        <KpiCard label="Avg. besøg pr. medlem" value="8,7" />
        <KpiCard label="Inaktive (+30 dage)" value="38" sub="Churn-risiko" subColor="red" />
        <KpiCard label="Split-moms %" value="58,5%" sub="Over 30 af hold-deltagere" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Top 3 hold">
          {[
            { name: 'STRONG Man 07:00', meta: 'Emma R. · 17/18 · 94%', val: '134 del.' },
            { name: 'STRONG Tor 17:30', meta: 'Lukas B. · 18/18 · 100%', val: '115 del.' },
            { name: 'REVIVAL Tir 09:00', meta: 'Sofie M. · 15/18 · 83%', val: '93 del.' },
          ].map((h, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid #e4e0f0' : 'none' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{h.name}</div>
                <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 2 }}>{h.meta}</div>
              </div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 18, fontWeight: 700, color: '#1a1520' }}>{h.val}</div>
            </div>
          ))}
        </Card>
        <Card title="Opmærksomhedspunkter">
          {[
            { label: 'REVIVAL Lør 10:00', sub: 'Lav belægning · 6/18 pladser', val: '33%', color: '#c0392b' },
            { label: '38 inaktive medlemmer', sub: 'Ikke besøgt i +30 dage', val: '↑ 4', color: '#c0392b' },
            { label: 'Split-moms steg', sub: 'Over-30 andel steg ift. april', val: '↑ 2,1%', color: '#2e8b6a' },
          ].map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 2 ? '1px solid #e4e0f0' : 'none' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.label}</div>
                <div style={{ fontSize: 11, color: '#8a85a0', marginTop: 2 }}>{a.sub}</div>
              </div>
              <div style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: 22, fontWeight: 700, color: a.color }}>{a.val}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}