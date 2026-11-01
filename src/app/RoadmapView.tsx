// Roadmap page layout from the Claude Design prototype (v4), converted by scripts/dc-to-jsx.py; values bound to data.
import { Fragment, useState } from 'react'
import { RoadmapPlanner } from './RoadmapPlanner'
import './roadmap.css'

const HOVER = ""

const Chev = ({ open }: { open: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="oklch(0.58 0.015 255)" strokeWidth="2" strokeLinecap="round" aria-hidden style={{ flex: 'none', transition: 'transform .2s', transform: open ? 'rotate(90deg)' : 'none' }}><path d="M9 6l6 6-6 6" /></svg>
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RoadmapView({ v }: { v: any }) {
  // Reference cards (75 Hard, bike setup, run ladder, race prep) start folded; the header keeps its one-line summary.
  // Which ones are open is remembered on this device.
  const [open, setOpen] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem('im4-rmfold') || '{}') } catch { return {} } })
  const tog = (k: string) => setOpen(o => { const n = { ...o, [k]: !o[k] }; try { localStorage.setItem('im4-rmfold', JSON.stringify(n)) } catch { /* private mode */ } return n })
  return (
    <>
      <style>{HOVER}</style>
      <div data-screen-label="roadmap" style={{"display": "flex", "flexDirection": "column", "gap": "16px"}}>
        {" "}
        <section style={{"position": "relative", "overflow": "hidden", "borderRadius": "22px", "border": "1px solid oklch(0.82 0.13 210 / 0.3)", "background": "radial-gradient(700px 300px at 100% 0%, oklch(0.82 0.13 210 / 0.14), transparent 70%), oklch(0.185 0.018 262 / 0.92)", "padding": "28px", "display": "flex", "flexWrap": "wrap", "gap": "28px", "alignItems": "center"}}>
          {" "}
          <div style={{"flex": "1 1 100%", "minWidth": "0", "width": "100%", "display": "flex", "flexDirection": "column", "gap": "12px", "paddingBottom": "22px", "borderBottom": "1px solid oklch(1 0 0 / 0.07)"}}>
            {" "}
            <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px"}}>
              {" "}
              <span style={{"fontSize": "12px", "color": "oklch(0.82 0.13 210)"}}>
                {"Coming up next"}
              </span>
              {" "}
              <div style={{"display": "flex", "alignItems": "center", "gap": "10px"}}>
                {" "}
                <div style={{"display": "flex", "gap": "6px"}}>
                  {(v.upDots || []).map((ud: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <button onClick={ud.pick} style={{"cursor": "pointer", "border": "0", "padding": "0", "width": ud.w, "height": "6px", "borderRadius": "3px", "background": ud.c, "boxShadow": ud.glow, "transition": "all .3s"}} />
                    </Fragment>
                  ))}
                </div>
                {" "}
                <button onClick={v.upPrev} style={{"cursor": "pointer", "width": "32px", "height": "32px", "borderRadius": "50%", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "oklch(1 0 0 / 0.04)", "color": "oklch(0.96 0.005 250)", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "14px", "display": "flex", "alignItems": "center", "justifyContent": "center"}}>
                  {"‹"}
                </button>
                <button onClick={v.upNext} style={{"cursor": "pointer", "width": "32px", "height": "32px", "borderRadius": "50%", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "oklch(1 0 0 / 0.04)", "color": "oklch(0.96 0.005 250)", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "14px", "display": "flex", "alignItems": "center", "justifyContent": "center"}}>
                  {"›"}
                </button>
                {" "}
              </div>
              {" "}
            </div>
            {" "}
            <div style={{"overflow": "hidden", "borderRadius": "16px", "minWidth": "0"}}>
              {" "}
              <div style={{"display": "flex", "transform": v.upTf, "transition": "transform .45s cubic-bezier(.2,.8,.2,1)"}}>
                {" "}
                {(v.upcoming || []).map((u: any, _i1: number) => (
                  <Fragment key={_i1}>
                    {" "}
                    <div className="rmup-item" style={{"flex": "0 0 100%", "padding": "18px 20px", "borderRadius": "16px", "background": "linear-gradient(90deg, oklch(0.82 0.13 210 / 0.12), oklch(1 0 0 / 0.02))", "border": "1px solid oklch(0.82 0.13 210 / 0.25)"}}>
                      {" "}
                      <div className="rmup-date" style={{"display": "flex", "flexDirection": "column", "alignItems": "center", "justifyContent": "center", "borderRadius": "14px", "border": "1px solid oklch(0.82 0.13 210 / 0.5)", "boxShadow": "0 0 18px oklch(0.82 0.13 210 / 0.3), inset 0 0 12px oklch(0.82 0.13 210 / 0.15)"}}>
                        <span style={{"fontSize": "11px", "color": "oklch(0.82 0.13 210)", "letterSpacing": "0.06em"}}>
                          {u.mon}
                        </span>
                        <span style={{"fontSize": "26px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "lineHeight": "1", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums"}}>
                          {u.day}
                        </span>
                      </div>
                      {" "}
                      <div className="rmup-info" style={{"display": "flex", "flexDirection": "column", "gap": "4px", "minWidth": "0"}}>
                        <span style={{"fontSize": "20px", "color": "oklch(0.96 0.005 250)", "letterSpacing": "-0.02em"}}>
                          {u.name}
                        </span>
                        <span style={{"fontSize": "13px", "color": "oklch(0.74 0.015 255)", "lineHeight": "1.5", "textWrap": "pretty"}}>
                          {u.detail}
                        </span>
                      </div>
                      {" "}
                      <div className="rmup-count">
                        <span style={{"fontSize": "30px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "lineHeight": "1", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums"}}>
                          {u.count}
                        </span>
                        <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                          {u.countU}
                        </span>
                        <span style={{"marginTop": "4px", "fontSize": "11px", "padding": "3px 9px", "borderRadius": "999px", "border": `1px solid ${u.cb}`, "color": u.cc}}>
                          {u.st}
                        </span>
                      </div>
                      {" "}
                    </div>
                    {" "}
                  </Fragment>
                ))}
                {" "}
              </div>
              {" "}
            </div>
            {" "}
          </div>
          {" "}
          <div style={{"flex": "1 1 320px", "display": "flex", "flexDirection": "column", "gap": "10px", "minWidth": "0"}}>
            {" "}
            <span style={{"fontSize": "12px", "color": "oklch(0.82 0.13 210)"}}>
              {"Primary goal"}
            </span>
            {" "}
            <span style={{"fontSize": "clamp(28px,3.2vw,40px)", "fontWeight": "400", "letterSpacing": "-0.035em", "lineHeight": "1.05", "color": "oklch(0.96 0.005 250)"}}>
              {v.rmT.event}
            </span>
            {" "}
            <span style={{"fontSize": "14px", "color": "oklch(0.74 0.015 255)"}}>
              {v.rmT.dateLine}
            </span>
            {" "}
            <span style={{"fontSize": "13px", "lineHeight": "1.55", "color": "oklch(0.74 0.015 255)", "maxWidth": "480px", "textWrap": "pretty"}}>
              {v.rmT.objective}
            </span>
            {" "}
          </div>
          {" "}
          <div style={{"display": "flex", "gap": "28px", "alignItems": "flex-end"}}>
            {" "}
            <div style={{"display": "flex", "flexDirection": "column", "gap": "2px"}}>
              <span style={{"fontSize": "64px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.05em", "lineHeight": "1", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums", "textShadow": "0 0 30px oklch(0.82 0.13 210 / 0.5)"}}>
                {v.race.days}
              </span>
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {"days to go"}
              </span>
            </div>
            {" "}
            <div style={{"display": "flex", "flexDirection": "column", "gap": "2px"}}>
              <span style={{"fontSize": "32px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.03em", "lineHeight": "1", "color": "oklch(0.74 0.015 255)", "fontVariantNumeric": "tabular-nums"}}>
                {v.race.weeks}
              </span>
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {"weeks"}
              </span>
            </div>
            {" "}
          </div>
          {" "}
          {v.goalTarget && (
            <div style={{ flex: '1 1 100%', borderRadius: '14px', border: '1px solid oklch(1 0 0 / 0.07)', background: 'oklch(1 0 0 / 0.025)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '13px', color: 'oklch(0.74 0.015 255)' }}>{v.goalTarget.k}</span>
                <span style={{ fontSize: '12px', color: 'oklch(0.58 0.015 255)', fontVariantNumeric: 'tabular-nums' }}>{v.goalTarget.goal}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '30px', fontFamily: "'Space Grotesk',system-ui,sans-serif", color: 'oklch(0.96 0.005 250)', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{v.goalTarget.now}</span>
                <span style={{ fontSize: '12px', color: 'oklch(0.58 0.015 255)' }}>{v.goalTarget.nowL}</span>
                {v.goalTarget.pace && <span style={{ marginLeft: 'auto', fontSize: '11px', padding: '3px 9px', borderRadius: '999px', border: `1px solid ${v.goalTarget.pc}`, color: v.goalTarget.pc }}>{v.goalTarget.pace}</span>}
              </div>
              <div style={{ height: '4px', borderRadius: '2px', background: 'oklch(1 0 0 / 0.07)' }}>
                <div style={{ height: '100%', width: v.goalTarget.pct, minWidth: '2%', borderRadius: '2px', background: 'oklch(0.82 0.13 210)', boxShadow: '0 0 10px oklch(0.82 0.13 210 / 0.5)' }} />
              </div>
              <span style={{ fontSize: '11.5px', color: 'oklch(0.58 0.015 255)' }}>{[v.goalTarget.start, v.goalTarget.need].filter(Boolean).join(' · ')}</span>
              {v.goalTarget.stale && <span style={{ fontSize: '11.5px', color: 'oklch(0.82 0.14 80)' }}>{v.goalTarget.stale}</span>}
            </div>
          )}
          <div style={{"flex": "1 1 100%", "display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,180px),1fr))", "gap": "10px"}}>
            {" "}
            {(v.legs || []).map((lg: any, _i1: number) => (
              <Fragment key={_i1}>
                {" "}
                <div style={{"borderRadius": "14px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "oklch(1 0 0 / 0.025)", "padding": "14px 16px", "display": "flex", "flexDirection": "column", "gap": "8px"}}>
                  {" "}
                  <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "baseline"}}>
                    <span style={{"fontSize": "13px", "color": "oklch(0.74 0.015 255)"}}>
                      {lg.k}
                    </span>
                    <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)", "fontVariantNumeric": "tabular-nums"}}>
                      {lg.goal}
                    </span>
                  </div>
                  {" "}
                  <span style={{"fontSize": "22px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums"}}>
                    {lg.done}
                    <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                      {" longest"}
                    </span>
                  </span>
                  {" "}
                  <div style={{"height": "4px", "borderRadius": "2px", "background": "oklch(1 0 0 / 0.07)"}}>
                    <div style={{"height": "100%", "width": lg.pct, "borderRadius": "2px", "background": "oklch(0.82 0.13 210)", "boxShadow": "0 0 10px oklch(0.82 0.13 210 / 0.5)"}} />
                  </div>
                  {" "}
                  <span style={{"fontSize": "11.5px", "color": lg.nc}}>
                    {lg.note}
                  </span>
                  {" "}
                </div>
                {" "}
              </Fragment>
            ))}
            {" "}
          </div>
          {" "}
        </section>
        {" "}
        <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "24px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
          <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
            <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
              {"Season plan"}
            </div>
            <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
              {v.rmT.planSpan}
            </span>
          </div>
          {" "}
          <div>
            <div style={{"display": "flex", "flexDirection": "column", "gap": "10px"}}>
              {" "}
              <div style={{"display": "grid", "gridTemplateColumns": "64px minmax(0,1fr)", "gap": "10px"}}>
                <span />
                {" "}
                <div style={{"position": "relative", "height": "16px", "fontSize": "11px", "color": "oklch(0.58 0.015 255)"}}>
                  {(v.months || []).map((mo: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <span style={{"position": "absolute", "left": mo.l, "top": "0"}}>
                        {mo.t}
                      </span>
                    </Fragment>
                  ))}
                </div>
                {" "}
              </div>
              {" "}
              {(v.lanes || []).map((ln: any, _i1: number) => (
                <Fragment key={_i1}>
                  {" "}
                  <div style={{"display": "grid", "gridTemplateColumns": "64px minmax(0,1fr)", "gap": "10px", "alignItems": "center"}}>
                    {" "}
                    <span style={{"fontSize": "13px", "color": "oklch(0.74 0.015 255)"}}>
                      {ln.k}
                    </span>
                    {" "}
                    <div style={{"position": "relative", "height": "34px", "borderRadius": "8px", "background": "oklch(1 0 0 / 0.025)"}}>
                      {" "}
                      {(ln.bars || []).map((br: any, _i2: number) => (
                        <Fragment key={_i2}>
                          <div title={br.t} style={{"position": "absolute", "top": "3px", "bottom": "3px", "left": br.l, "width": br.w, "borderRadius": "6px", "background": br.bg, "border": br.b, "display": "flex", "alignItems": "center", "padding": br.pad, "overflow": "hidden"}}>
                            <span style={{"fontSize": "11px", "color": br.fg, "whiteSpace": "nowrap", "overflow": "hidden", "textOverflow": "ellipsis"}}>
                              {br.t}
                            </span>
                          </div>
                        </Fragment>
                      ))}
                      {" "}
                      {(ln.pins || []).map((pn: any, _i2: number) => (
                        <Fragment key={_i2}>
                          <div title={pn.t} style={{"position": "absolute", "top": "50%", "left": pn.l, "width": "12px", "height": "12px", "margin": "-6px 0 0 -6px", "transform": "rotate(45deg)", "background": pn.c, "boxShadow": `0 0 10px ${pn.c}`}} />
                        </Fragment>
                      ))}
                      {" "}
                      <div style={{"position": "absolute", "top": "-6px", "bottom": "-6px", "left": v.todayL, "width": "1.5px", "background": "oklch(0.96 0.005 250)", "boxShadow": "0 0 8px oklch(0.82 0.13 210)"}} />
                      {" "}
                    </div>
                    {" "}
                  </div>
                  {" "}
                </Fragment>
              ))}
              {" "}
              <div style={{"display": "grid", "gridTemplateColumns": "64px minmax(0,1fr)", "gap": "10px"}}>
                <span />
                <div style={{"position": "relative", "height": "16px"}}>
                  <span style={{"position": "absolute", "left": v.todayL, "transform": "translateX(-50%)", "fontSize": "11px", "color": "oklch(0.96 0.005 250)"}}>
                    {"Today"}
                  </span>
                </div>
              </div>
              {" "}
            </div>
          </div>
          {" "}
          <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
            {v.rmT.tbdNote}
          </span>
        </section>
        {" "}
        <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,380px),1fr))", "gap": "16px", "alignItems": "stretch"}}>
          <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
            <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
              <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                {"Milestones"}
              </div>
              <div style={{"display": "flex", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                  {v.msDone}
                </span>
                <button onClick={v.rmEditOpen} className="rme-open" style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "5px 10px", "borderRadius": "8px", "border": "1px solid oklch(0.82 0.13 210 / 0.4)", "background": "transparent", "color": "oklch(0.82 0.13 210)"}}>
                  {"Edit roadmap"}
                </button>
                <div style={{"display": "flex", "gap": "2px", "padding": "3px", "borderRadius": "10px", "background": "oklch(1 0 0 / 0.04)", "border": "1px solid oklch(1 0 0 / 0.07)"}}>
                  {(v.msTabs || []).map((o: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <button onClick={o.pick} style={{"border": "0", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "6px 12px", "borderRadius": "7px", "background": o.bg, "color": o.fg, "transition": "background .2s,color .2s"}}>
                        {o.label}
                      </button>
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
            {" "}
            <div style={{"position": "relative", "display": "flex", "flexDirection": "column"}}>
              {" "}
              <div style={{"position": "absolute", "left": "5px", "top": "14px", "bottom": "14px", "width": "1px", "background": "oklch(1 0 0 / 0.07)"}} />
              {" "}
              {(v.milestones || []).map((X: any, _i1: number) => (
                <Fragment key={_i1}>
                  {" "}
                  <div style={{"display": "grid", "gridTemplateColumns": "20px 1fr auto", "gap": "12px", "alignItems": "center", "padding": X.pad, "position": "relative"}}>
                    {" "}
                    <span style={{"width": X.sz, "height": X.sz, "marginLeft": X.ml, "borderRadius": "50%", "background": X.dot, "border": X.ring, "boxShadow": X.glow, "position": "relative"}} />
                    {" "}
                    <div style={{"minWidth": "0", "display": "flex", "flexDirection": "column", "gap": "2px"}}>
                      <span style={{"fontSize": X.fs, "fontFamily": X.ff, "fontWeight": X.fw, "color": X.fg}}>
                        {X.name}
                      </span>
                      <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)", "fontVariantNumeric": "tabular-nums"}}>
                        {X.when}
                      </span>
                    </div>
                    {" "}
                    <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px", "padding": "3px 9px", "borderRadius": "999px", "border": `1px solid ${X.cb}`, "fontSize": "11px", "color": X.cc, "whiteSpace": "nowrap"}}>
                      <span style={{"width": "5px", "height": "5px", "borderRadius": "50%", "background": X.cc}} />
                      {X.st}
                    </span>
                    {" "}
                  </div>
                  {" "}
                </Fragment>
              ))}
              {" "}
            </div>
          </section>
          <div style={{"display": "flex", "flexDirection": "column", "gap": "16px", "minWidth": "0"}}>
            <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
              <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                  {"This week"}
                </div>
                <span style={{"fontSize": "12px", "color": "oklch(0.82 0.14 80)"}}>
                  {v.rmT.weekMeta}
                </span>
              </div>
              {" "}
              <div style={{"display": "flex", "flexDirection": "column"}}>
                {" "}
                {(v.week || []).map((dy: any, _i1: number) => (
                  <Fragment key={_i1}>
                    {" "}
                    <div style={{"display": "grid", "gridTemplateColumns": "44px 1fr auto", "gap": "12px", "alignItems": "center", "padding": "10px 12px", "borderRadius": "10px", "background": dy.bg, "border": dy.b}}>
                      {" "}
                      <span style={{"fontSize": "12px", "color": dy.dc}}>
                        {dy.d}
                      </span>
                      {" "}
                      <div style={{"display": "flex", "flexWrap": "wrap", "gap": "6px"}}>
                        {(dy.items || []).map((it: any, _i2: number) => (
                          <Fragment key={_i2}>
                            <span style={{"fontSize": "12.5px", "padding": "4px 10px", "borderRadius": "999px", "background": it.bg, "color": it.fg}}>
                              {it.t}
                            </span>
                          </Fragment>
                        ))}
                      </div>
                      {" "}
                      <span style={{"fontSize": "11px", "color": dy.sc}}>
                        {dy.s}
                      </span>
                      {" "}
                    </div>
                    {" "}
                  </Fragment>
                ))}
                {" "}
              </div>
              {" "}
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {v.rmT.weekNote}
              </span>
            </section>
            {(v.rules || []).length ? (
            <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
              <div role="button" tabIndex={0} aria-expanded={!!open.hard} onClick={() => tog('hard')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog('hard') } }} style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap", "cursor": "pointer"}}>
                <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                  {"Sustainable 75 Hard"}
                </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
                <span style={{"fontSize": "12px", "color": "oklch(0.78 0.15 160)"}}>
                  {v.rmT.streak}
                </span>
                <Chev open={!!open.hard} /></span>
            </div>{open.hard ? (<>
              {" "}
              <div style={{"display": "flex", "flexDirection": "column", "gap": "10px"}}>
                {" "}
                {(v.rules || []).map((ru: any, _i1: number) => (
                  <Fragment key={_i1}>
                    <div style={{"display": "grid", "gridTemplateColumns": "1fr auto", "gap": "12px", "fontSize": "13px", "alignItems": "baseline"}}>
                      <span style={{"color": "oklch(0.96 0.005 250)"}}>
                        {ru.k}
                      </span>
                      <span style={{"color": ru.c, "fontVariantNumeric": "tabular-nums"}}>
                        {ru.v}
                      </span>
                    </div>
                  </Fragment>
                ))}
                {" "}
              </div>
            </>) : null}
          </section>
            ) : null}
          </div>
        </div>
        {" "}
        <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,340px),1fr))", "gap": "16px", "alignItems": "start"}}>
          {v.hasBike ? (
          <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
            <div role="button" tabIndex={0} aria-expanded={!!open.bike} onClick={() => tog('bike')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog('bike') } }} style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap", "cursor": "pointer"}}>
              <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                {"Bike setup"}
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
              <span style={{"fontSize": "12px", "color": "oklch(0.7 0.18 25)"}}>
                {v.rmT.bikePriority}
              </span>
              <Chev open={!!open.bike} /></span>
            </div>{open.bike ? (<>
            {" "}
            <div style={{"display": "flex", "flexDirection": "column"}}>
              {" "}
              {(v.bikeKit || []).map((X: any, _i1: number) => (
                <Fragment key={_i1}>
                  {" "}
                  <div style={{"display": "grid", "gridTemplateColumns": "1fr auto", "gap": "12px", "alignItems": "center", "padding": "10px 0", "borderTop": "1px solid oklch(1 0 0 / 0.07)"}}>
                    {" "}
                    <div style={{"display": "flex", "flexDirection": "column", "gap": "2px", "minWidth": "0"}}>
                      <span style={{"fontSize": "13.5px", "color": "oklch(0.96 0.005 250)"}}>
                        {X.name}
                      </span>
                      <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                        {X.sub}
                      </span>
                    </div>
                    {" "}
                    <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px", "padding": "3px 9px", "borderRadius": "999px", "border": `1px solid ${X.cb}`, "fontSize": "11px", "color": X.cc, "whiteSpace": "nowrap"}}>
                      <span style={{"width": "5px", "height": "5px", "borderRadius": "50%", "background": X.cc}} />
                      {X.st}
                    </span>
                    {" "}
                  </div>
                  {" "}
                </Fragment>
              ))}
              {" "}
            </div>
            {" "}
            <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)", "lineHeight": "1.5"}}>
              {v.rmT.bikeNote}
            </span>
          </>) : null}
          </section>
          ) : null}
          {v.hasLadder ? (
          <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
            <div role="button" tabIndex={0} aria-expanded={!!open.ladder} onClick={() => tog('ladder')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog('ladder') } }} style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap", "cursor": "pointer"}}>
              <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                {"Run ladder"}
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {v.rmT.comfortable}
              </span>
              <Chev open={!!open.ladder} /></span>
            </div>{open.ladder ? (<>
            {" "}
            <div style={{"display": "flex", "flexDirection": "column", "gap": "8px"}}>
              {" "}
              {(v.ladder || []).map((ld: any, _i1: number) => (
                <Fragment key={_i1}>
                  {" "}
                  <div style={{"display": "grid", "gridTemplateColumns": "1fr 70px", "gap": "12px", "alignItems": "center"}}>
                    {" "}
                    <div style={{"display": "flex", "flexDirection": "column", "gap": "6px"}}>
                      {" "}
                      <div style={{"display": "flex", "justifyContent": "space-between", "fontSize": "13px"}}>
                        <span style={{"color": "oklch(0.96 0.005 250)"}}>
                          {ld.k}
                        </span>
                        <span style={{"color": "oklch(0.58 0.015 255)"}}>
                          {ld.when}
                        </span>
                      </div>
                      {" "}
                      <div style={{"height": "6px", "borderRadius": "3px", "background": "oklch(1 0 0 / 0.07)"}}>
                        <div style={{"height": "100%", "width": ld.pct, "borderRadius": "3px", "background": ld.c, "boxShadow": ld.glow}} />
                      </div>
                      {" "}
                    </div>
                    {" "}
                    <span style={{"fontSize": "13px", "textAlign": "right", "color": "oklch(0.74 0.015 255)", "fontVariantNumeric": "tabular-nums"}}>
                      {ld.mi}
                    </span>
                    {" "}
                  </div>
                  {" "}
                </Fragment>
              ))}
              {" "}
            </div>
            {" "}
            <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
              {v.rmT.ladderNote}
            </span>
          </>) : null}
          </section>
          ) : null}
        </div>
        <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,380px),1fr))", "gap": "16px", "alignItems": "stretch"}}>
          {v.hasProgress ? (
          <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
            <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
              <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                {"Progress to race"}
              </div>
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {"Measured monthly"}
              </span>
            </div>
            {" "}
            <div style={{"display": "flex", "flexDirection": "column", "gap": "18px"}}>
              {" "}
              {(v.ladderGoals || []).map((lg2: any, _i1: number) => (
                <Fragment key={_i1}>
                  {" "}
                  <div style={{"display": "flex", "flexDirection": "column", "gap": "8px"}}>
                    {" "}
                    <div style={{"display": "flex", "justifyContent": "space-between", "gap": "10px", "fontSize": "13px"}}>
                      <span style={{"color": "oklch(0.96 0.005 250)"}}>
                        {lg2.k}
                      </span>
                      <span style={{"color": lg2.nc}}>
                        {lg2.note}
                      </span>
                    </div>
                    {" "}
                    <div style={{"display": "flex", "alignItems": "flex-end", "gap": "4px", "height": "70px"}}>
                      {(lg2.bars || []).map((b: any, _i2: number) => (
                        <Fragment key={_i2}>
                          <div title={b.t} style={{"flex": "1", "display": "flex", "flexDirection": "column", "gap": "4px", "height": "100%", "justifyContent": "flex-end"}}>
                            <div style={{"height": b.h, "borderRadius": "3px 3px 1px 1px", "background": b.c, "border": b.bd, "boxShadow": b.glow}} />
                            <span style={{"fontSize": "9.5px", "color": "oklch(0.58 0.015 255)", "textAlign": "center"}}>
                              {b.l}
                            </span>
                          </div>
                        </Fragment>
                      ))}
                    </div>
                    {" "}
                  </div>
                  {" "}
                </Fragment>
              ))}
              {" "}
              <div style={{"display": "flex", "gap": "14px", "fontSize": "11.5px", "color": "oklch(0.58 0.015 255)", "flexWrap": "wrap"}}>
                <span style={{"display": "flex", "alignItems": "center", "gap": "6px"}}>
                  <span style={{"width": "8px", "height": "8px", "borderRadius": "2px", "background": "oklch(0.82 0.13 210)"}} />
                  {"Longest done"}
                </span>
                <span style={{"display": "flex", "alignItems": "center", "gap": "6px"}}>
                  <span style={{"width": "8px", "height": "8px", "borderRadius": "2px", "border": "1px dashed oklch(0.82 0.13 210 / 0.6)"}} />
                  {v.rmT.targetLegend}
                </span>
              </div>
              {" "}
            </div>
          </section>
          ) : null}
          <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
            <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
              <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                {"Aerobic efficiency"}
              </div>
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {"Run pace at 140 bpm, estimated"}
              </span>
            </div>
            {" "}
            <div style={{"display": "flex", "alignItems": "baseline", "gap": "8px", "flexWrap": "wrap"}}>
              <span style={{"fontSize": "34px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.03em", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums"}}>
                {v.eff.now}
              </span>
              <span style={{"fontSize": "13px", "color": "oklch(0.58 0.015 255)"}}>
                {"/mi at 140 bpm"}
              </span>
              <span style={{"fontSize": "12px", "color": "oklch(0.78 0.15 160)", "marginLeft": "auto"}}>
                {v.eff.delta}
              </span>
            </div>
            {" "}
            <div style={{"display": "flex", "alignItems": "flex-end", "gap": "6px", "height": "120px"}}>
              {(v.eff.bars || []).map((b: any, _i1: number) => (
                <Fragment key={_i1}>
                  <div title={b.t} style={{"flex": "1", "display": "flex", "flexDirection": "column", "gap": "4px", "height": "100%", "justifyContent": "flex-end", "minWidth": "0"}}>
                    <div style={{"height": b.h, "borderRadius": "3px 3px 1px 1px", "background": b.c, "boxShadow": b.glow}} />
                    <span style={{"fontSize": "9.5px", "color": "oklch(0.58 0.015 255)", "textAlign": "center", "whiteSpace": "nowrap", "overflow": "hidden"}}>
                      {b.l}
                    </span>
                  </div>
                </Fragment>
              ))}
            </div>
            {" "}
            <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)", "lineHeight": "1.5"}}>
              {v.rmT.effNote}
            </span>
            {" "}
            <div style={{"display": "flex", "flexDirection": "column", "gap": "8px", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "paddingTop": "14px"}}>
              {" "}
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {"Checkpoints"}
              </span>
              {" "}
              {(v.checkpoints || []).map((cp: any, _i1: number) => (
                <Fragment key={_i1}>
                  <div style={{"display": "grid", "gridTemplateColumns": "1fr auto", "gap": "12px", "fontSize": "13px"}}>
                    <span style={{"color": "oklch(0.96 0.005 250)"}}>
                      {cp.k}
                    </span>
                    <span style={{"color": cp.c}}>
                      {cp.v}
                    </span>
                  </div>
                </Fragment>
              ))}
              {" "}
            </div>
          </section>
        </div>
        {v.hasPrep ? (
        <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "24px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
          <div role="button" tabIndex={0} aria-expanded={!!open.prep} onClick={() => tog('prep')} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tog('prep') } }} style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap", "cursor": "pointer"}}>
            <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
              {"Race prep"}
            </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto' }}>
            {open.prep ? (<div onClick={e => e.stopPropagation()} style={{"display": "flex", "gap": "2px", "padding": "3px", "borderRadius": "10px", "background": "oklch(1 0 0 / 0.04)", "border": "1px solid oklch(1 0 0 / 0.07)", "flexWrap": "wrap"}}>
              {(v.prepTabs || []).map((o: any, _i1: number) => (
                <Fragment key={_i1}>
                  <button onClick={o.pick} style={{"border": "0", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "6px 12px", "borderRadius": "7px", "background": o.bg, "color": o.fg, "transition": "background .2s,color .2s"}}>
                    {o.label}
                  </button>
                </Fragment>
              ))}
            </div>) : null}
            <Chev open={!!open.prep} /></span>
            </div>{open.prep ? (<>
          {" "}
          <div style={{"display": "flex", "flexWrap": "wrap", "gap": "24px"}}>
            {" "}
            <div style={{"flex": "1 1 300px", "display": "flex", "flexDirection": "column", "gap": "10px", "minWidth": "0"}}>
              {" "}
              <span style={{"fontSize": "22px", "color": "oklch(0.96 0.005 250)", "letterSpacing": "-0.02em"}}>
                {v.prep.title}
              </span>
              {" "}
              <span style={{"fontSize": "13px", "color": "oklch(0.74 0.015 255)", "lineHeight": "1.55"}}>
                {v.prep.sub}
              </span>
              {" "}
              <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(110px,1fr))", "gap": "1px", "background": "oklch(1 0 0 / 0.07)", "borderRadius": "12px", "overflow": "hidden", "marginTop": "6px"}}>
                {(v.prep.kpis || []).map((m: any, _i1: number) => (
                  <Fragment key={_i1}>
                    <div style={{"background": "oklch(0.185 0.018 262)", "padding": "12px 14px", "display": "flex", "flexDirection": "column", "gap": "3px"}}>
                      <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                        {m.k}
                      </span>
                      <span style={{"fontSize": "18px", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums"}}>
                        {m.v}
                      </span>
                    </div>
                  </Fragment>
                ))}
              </div>
              {" "}
            </div>
            {" "}
            <div style={{"flex": "1.4 1 340px", "display": "flex", "flexDirection": "column", "minWidth": "0"}}>
              {" "}
              {(v.prep.rows || []).map((pr2: any, _i1: number) => (
                <Fragment key={_i1}>
                  <div style={{"display": "grid", "gridTemplateColumns": "110px minmax(0,1fr)", "gap": "14px", "padding": "11px 0", "borderTop": "1px solid oklch(1 0 0 / 0.07)"}}>
                    <span style={{"fontSize": "12.5px", "color": pr2.c}}>
                      {pr2.k}
                    </span>
                    <span style={{"fontSize": "13px", "color": "oklch(0.96 0.005 250)", "lineHeight": "1.5"}}>
                      {pr2.v}
                    </span>
                  </div>
                </Fragment>
              ))}
              {" "}
            </div>
            {" "}
          </div>
        </>) : null}
          </section>
        ) : null}
      </div>
      {v.rmEditOn ? (<RoadmapPlanner today={v.D.today} onClose={v.rmEditClose} />) : null}
    </>
  )
}
