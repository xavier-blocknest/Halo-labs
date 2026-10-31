// Page layout, originally converted from the Claude Design prototype (v4). Hand-maintained from here on.
import { Fragment } from 'react'
import './hover.css'
import { DataPage } from '../app/DataPage'
import { FuelView } from '../app/FuelView'
import { VoiceView } from '../app/VoiceView'
import { RoadmapPage } from '../app/RoadmapPage'
import { RoadmapView } from '../app/RoadmapView'
import { RecoveryWork } from '../app/RecoveryWork'
import { LiftVolume } from '../app/LiftVolume'
import { JournalPage } from '../app/JournalPage'
import { WeekPlan } from '../app/WeekPlan'

/** A WHOOP-style ring (Recovery, Sleep): sizes with its column, up to 184 px; text scales with it (cqw). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Dial({ d }: { d: any }) {
  return (
    <div style={{"flex": "1 1 0", "maxWidth": "184px", "minWidth": "0", "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "10px"}}>
      <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>{d.k}</span>
      <div style={{"position": "relative", "width": "100%", "aspectRatio": "1", "containerType": "inline-size"}}>
        <div style={{"position": "absolute", "inset": "14%", "borderRadius": "50%", "background": `radial-gradient(circle, ${d.wash}, transparent 70%)`}} />
        <svg viewBox="0 0 100 100" style={{"position": "relative", "width": "100%", "height": "100%", "transform": "rotate(-90deg)", "overflow": "visible"}}>
          <circle cx="50" cy="50" r="44" fill="none" stroke="oklch(1 0 0 / 0.07)" strokeWidth="5" />
          <circle cx="50" cy="50" r="44" fill="none" stroke={d.c} strokeWidth="5" strokeLinecap="round" strokeDasharray={d.dash} style={{"filter": d.glow}} />
        </svg>
        <div style={{"position": "absolute", "inset": "0", "display": "flex", "flexDirection": "column", "alignItems": "center", "justifyContent": "center", "gap": "3.3cqw"}}>
          <span style={{"display": "flex", "alignItems": "flex-start", "lineHeight": "1"}}>
            <span style={{"fontSize": "30cqw", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.03em", "lineHeight": "1", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums"}}>
              {d.v}
            </span>
            <span style={{"fontSize": "11cqw", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "lineHeight": "1", "marginTop": "3.8cqw", "marginLeft": "1.6cqw", "color": "oklch(0.74 0.015 255)"}}>
              {d.unit}
            </span>
          </span>
          <span style={{"fontSize": "max(10px, 6cqw)", "fontWeight": "500", "letterSpacing": "0.14em", "textTransform": "uppercase", "color": d.c}}>
            {d.word}
          </span>
        </div>
      </div>
      <span style={{"fontSize": "13px", "color": "oklch(0.74 0.015 255)", "textAlign": "center"}}>
        {d.advice}
      </span>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function View({ v }: { v: any }) {
  return (
    <>
    {" "}
    <div style={{"minHeight": "100vh", "background": "radial-gradient(900px 500px at 75% -10%, oklch(0.82 0.13 210 / 0.10), transparent 70%), linear-gradient(oklch(1 0 0 / 0.018) 1px, transparent 1px) 0 0 / 48px 48px, linear-gradient(90deg, oklch(1 0 0 / 0.018) 1px, transparent 1px) 0 0 / 48px 48px, oklch(0.145 0.016 262)", "display": "flex", "flexWrap": "nowrap", "alignItems": "flex-start"}}>
      {v.bootFx}{v.pageFx}{" "}
      <aside style={{"flex": `0 0 ${v.L.railW}`, "width": v.L.railW, "position": "sticky", "top": "0", "height": "100vh", "overflowY": "auto", "scrollbarWidth": "none", "padding": `24px ${v.L.railPad}`, "transition": "flex-basis .3s ease, width .3s ease", "display": v.L.railDisp, "flexDirection": "column", "gap": "28px", "borderRight": "1px solid oklch(1 0 0 / 0.07)", "background": "oklch(0.13 0.016 262 / 0.7)", "backdropFilter": "blur(12px)"}}>
        {" "}
        <div style={{"display": "flex", "alignItems": "center", "gap": "12px", "padding": `0 ${v.L.brandPad}`, "justifyContent": v.L.jc}}>
          {" "}
          <div style={{"flex": "none", "position": "relative", "width": "38px", "height": "38px", "borderRadius": "50%", "border": "2.5px solid oklch(0.88 0.11 210)", "boxShadow": "0 0 14px oklch(0.82 0.13 210 / 0.7), 0 0 30px oklch(0.82 0.13 210 / 0.35), inset 0 0 10px oklch(0.82 0.13 210 / 0.55)", "display": "flex", "alignItems": "center", "justifyContent": "center", "animation": "imHalo 3.2s ease-in-out infinite"}}>
            <div style={{"width": "20px", "height": "20px", "borderRadius": "50%", "border": "1px solid oklch(0.82 0.13 210 / 0.45)", "boxShadow": "inset 0 0 6px oklch(0.82 0.13 210 / 0.4)", "animation": "imCore 3.2s ease-in-out infinite"}} />
            <div style={{"position": "absolute", "inset": "-2.5px", "borderRadius": "50%", "animation": "imOrbit 6s linear infinite"}}>
              <div style={{"position": "absolute", "top": "-2px", "left": "50%", "width": "6px", "height": "6px", "marginLeft": "-3px", "borderRadius": "50%", "background": "oklch(0.97 0.03 210)", "boxShadow": "0 0 8px oklch(0.9 0.1 210), 0 0 14px oklch(0.82 0.13 210)"}} />
            </div>
            <div style={{"position": "absolute", "inset": "-7px", "borderRadius": "50%", "border": "1px solid oklch(0.82 0.13 210 / 0.5)", "animation": "imRipple 3.2s ease-out infinite", "pointerEvents": "none"}} />
          </div>
          {" "}
          <div style={{"display": v.L.txtDisp, "flexDirection": "column", "gap": "3px", "lineHeight": "1"}}>
            <span style={{"fontFamily": "'Space Grotesk',system-ui,sans-serif", "fontSize": "17px", "fontWeight": "600", "letterSpacing": "0.16em", "color": "oklch(0.96 0.005 250)", "textShadow": "0 0 14px oklch(0.82 0.13 210 / 0.45)"}}>
              {"HALO"}
            </span>
            <span style={{"fontFamily": "'Space Grotesk',system-ui,sans-serif", "fontSize": "10.5px", "fontWeight": "500", "letterSpacing": "0.42em", "color": "oklch(0.82 0.13 210)", "paddingLeft": "1px", "animation": "imShine 4s ease-in-out infinite"}}>
              {"LABS"}
            </span>
          </div>
          {" "}
        </div>
        {" "}
        <nav style={{"display": "flex", "flexDirection": "column", "gap": "2px"}}>
          {" "}
          {(v.nav || []).map((t: any, _i1: number) => (
            <Fragment key={_i1}>
              {" "}
              <button onClick={t.go} title={t.label} style={{"position": "relative", "border": "0", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "textAlign": "left", "fontSize": "14px", "padding": "10px 12px", "borderRadius": "10px", "display": "flex", "alignItems": "center", "justifyContent": v.L.jc, "gap": "12px", "background": t.bg, "color": t.fg, "transition": "background .2s,color .2s,transform .12s"}}>
                {" "}
                <span style={{"position": "absolute", "left": "0", "top": "50%", "marginTop": "-8px", "width": "3px", "height": "16px", "borderRadius": "2px", "background": t.bar, "boxShadow": t.glow}} />
                {" "}
                <span style={{"color": t.ic, "display": "flex"}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{"flex": "none"}}>
                    <path d={t.icon} />
                  </svg>
                </span>
                {" "}
                <span style={{"flex": "1", "display": v.L.txtDisp}}>
                  {t.label}
                </span>
                {" "}
                <span style={{"display": v.L.badgeDisp, "fontSize": "11px", "color": t.bc, "fontVariantNumeric": "tabular-nums", "position": v.L.badgePos, "top": "4px", "right": "6px"}}>
                  {t.badge}
                </span>
                {" "}
              </button>
              {" "}
            </Fragment>
          ))}
          {" "}
        </nav>
        {" "}
        <div style={{"marginTop": "auto", "display": "flex", "flexDirection": "column", "gap": "14px"}}>
          {" "}
          {" "}
          <button data-sfx="1" onClick={v.snd.toggle} title={v.snd.t} style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "border": "0", "background": "transparent", "padding": `6px ${v.L.brandPad}`, "display": "flex", "alignItems": "center", "justifyContent": v.L.jc, "gap": "10px", "fontSize": "12.5px", "color": v.snd.fg}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{"flex": "none"}}>
              <path d={v.snd.icon} />
            </svg>
            <span style={{"display": v.L.txtDisp}}>
              {v.snd.t}
            </span>
          </button>
          <button onClick={v.lockNow} title="Lock Halo Labs" style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "border": "0", "background": "transparent", "padding": `6px ${v.L.brandPad}`, "display": "flex", "alignItems": "center", "justifyContent": v.L.jc, "gap": "10px", "fontSize": "12.5px", "color": "oklch(0.74 0.015 255)"}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{"flex": "none"}}>
              <path d="M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z" />
            </svg>
            <span style={{"display": v.L.txtDisp}}>
              {"Lock"}
            </span>
          </button>
          {" "}
          <button onClick={v.go.settings} title="Settings" style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "textAlign": "left", "border": `1px solid ${v.setNav.bc}`, "background": v.setNav.bg, "borderRadius": "12px", "padding": v.L.setPad, "display": "flex", "flexDirection": "column", "gap": "9px"}}>
            {" "}
            <span style={{"display": "flex", "justifyContent": v.L.jc, "alignItems": "center", "gap": "10px", "fontSize": "14px", "color": v.setNav.fg}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{"flex": "none"}}>
                <path d={v.setIcon} />
              </svg>
              <span style={{"flex": "1", "display": v.L.txtDisp}}>
                {"Settings"}
              </span>
              <span style={{"display": v.L.txtDisp, "fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {"→"}
              </span>
            </span>
            {" "}
            <span style={{"display": v.L.cardDisp, "alignItems": "center", "gap": "8px"}}>
              <span style={{"display": "flex", "gap": "4px"}}>
                {(v.sources || []).map((src: any, _i1: number) => (
                  <Fragment key={_i1}>
                    <span title={`${src.name} · ${src.sync}`} style={{"width": "6px", "height": "6px", "borderRadius": "50%", "background": src.dot, "boxShadow": src.glow}} />
                  </Fragment>
                ))}
              </span>
              <span style={{"fontSize": "11.5px", "color": "oklch(0.58 0.015 255)"}}>
                {v.srcSummary}
              </span>
            </span>
            {" "}
          </button>
          {" "}
        </div>
        {" "}
      </aside>
      {" "}
      <main style={{"flex": "1 1 0", "minWidth": "0", "padding": v.L.mainPad, "display": "flex", "flexDirection": "column", "gap": "24px", "maxWidth": v.L.mainMax, "margin": "0 auto"}}>
        {" "}
        <header style={{"display": "flex", "flexDirection": "column", "gap": "8px"}}>
          {" "}
          <div style={{"display": "flex", "justifyContent": "space-between", "gap": "12px", "flexWrap": "wrap", "fontSize": "12px"}}>
            <span style={{"color": "oklch(0.82 0.13 210)"}}>
              {v.pg.label}
            </span>
            <span style={{"color": "oklch(0.58 0.015 255)"}}>
              {v.T.now}
            </span>
          </div>
          {" "}
          <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "flex-end", "gap": "16px", "flexWrap": "wrap"}}>
          <h1 style={{"flex": "1 1 420px", "margin": "0", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "fontSize": "clamp(24px,2.6vw,32px)", "fontWeight": "400", "letterSpacing": "-0.03em", "lineHeight": "1.2", "color": "oklch(0.96 0.005 250)", "textWrap": "pretty", "maxWidth": "900px"}}>
            {v.pg.title}
          </h1>
          <button onClick={v.voiceOpen} className="voice-btn" style={{"flex": "none", "marginLeft": "auto", "cursor": "pointer", "fontFamily": "inherit", "display": v.L.mob ? "none" : "flex", "alignItems": "center", "gap": "10px", "padding": "7px 16px 7px 7px", "borderRadius": "999px", "border": "1px solid oklch(0.82 0.13 210 / 0.45)", "background": "oklch(0.82 0.13 210 / 0.08)", "color": "oklch(0.96 0.005 250)", "fontSize": "13.5px", "boxShadow": "0 0 18px oklch(0.82 0.13 210 / 0.15)", "transition": "background .2s, box-shadow .2s"}}>
            <span style={{"width": "28px", "height": "28px", "borderRadius": "50%", "background": "radial-gradient(circle at 35% 30%, oklch(0.95 0.06 210), oklch(0.7 0.14 220) 60%, oklch(0.45 0.12 250))", "boxShadow": "0 0 12px oklch(0.82 0.13 210 / 0.6)", "display": "flex", "alignItems": "center", "justifyContent": "center", "gap": "2px"}}>
              <span style={{"width": "2px", "height": "8px", "borderRadius": "1px", "background": "oklch(0.15 0.02 262)"}} /><span style={{"width": "2px", "height": "12px", "borderRadius": "1px", "background": "oklch(0.15 0.02 262)"}} /><span style={{"width": "2px", "height": "7px", "borderRadius": "1px", "background": "oklch(0.15 0.02 262)"}} />
            </span>
            {"Voice"}
          </button>
          </div>
          {" "}
        </header>
        {" "}
        {v.show.command ? (<>
          <div data-screen-label="command" style={{"display": "flex", "flexDirection": "column", "gap": "16px"}}>
            <section data-screen-label="brief" className="brief" style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "20px 22px", "display": "flex", "gap": "16px", "alignItems": "flex-start", "position": "relative", "overflow": "hidden"}}>
              {" "}{v.briefOrb}{" "}
              <div className="brief-body" style={{"flex": "1", "display": "flex", "flexDirection": "column", "gap": "14px", "minWidth": "0"}}>
                {" "}
                <div className="brief-head" style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "10px", "flexWrap": "wrap"}}>
                  {" "}
                  <div style={{"display": "flex", "flexDirection": "column", "gap": "2px"}}>
                    <span style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "color": "oklch(0.96 0.005 250)"}}>
                      {"Morning brief"}
                    </span>
                    <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                      {v.brief.meta}
                    </span>
                  </div>
                  {" "}
                  <div className="brief-btns" style={{"display": "flex", "gap": "6px", "flexWrap": "wrap"}}>
                    <button onClick={v.brief.listen} title="Read aloud" style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "6px 11px", "borderRadius": "8px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "transparent", "color": "oklch(0.74 0.015 255)", "display": "flex", "alignItems": "center", "gap": "6px"}} className="dch0">
                      {v.brief.listenT}
                    </button>
                    <button onClick={v.brief.regen} title="Write a new brief" style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "6px 11px", "borderRadius": "8px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "transparent", "color": "oklch(0.74 0.015 255)", "display": "flex", "alignItems": "center", "gap": "6px"}} className="dch1">
                      {"Regenerate"}
                    </button>
                    <button onClick={v.brief.ask} title="Follow up in chat" style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "6px 11px", "borderRadius": "8px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "transparent", "color": "oklch(0.74 0.015 255)", "display": "flex", "alignItems": "center", "gap": "6px"}} className="dch2">
                      {"Ask "}{v.coachName}
                    </button>
                  </div>
                  {" "}
                </div>
                {" "}
                {v.brief.loading ? (<>
                  {v.briefSkel}
                </>) : null}
                {" "}
                {v.brief.ready ? (<>
                  {" "}
                  <div style={{"display": "flex", "flexDirection": "column", "gap": "10px"}}>
                    {" "}
                    {(v.brief.rows || []).map((br: any, _i1: number) => (
                      <Fragment key={_i1}>
                        {" "}
                        <div className="brief-row" style={{"display": "grid", "gridTemplateColumns": "96px minmax(0,1fr)", "gap": "14px", "alignItems": "baseline"}}>
                          <span style={{"fontSize": "12px", "color": br.c}}>
                            {br.k}
                          </span>
                          <span style={{"fontSize": "14.5px", "lineHeight": "1.55", "color": "oklch(0.96 0.005 250)", "textWrap": "pretty"}}>
                            {br.v}
                          </span>
                        </div>
                        {" "}
                      </Fragment>
                    ))}
                    {" "}
                  </div>
                  {" "}
                </>) : null}
                {" "}
              </div>
              {" "}
            </section>
            <section data-screen-label="verdict" style={{"position": "relative", "overflow": "hidden", "borderRadius": "22px", "border": `1px solid ${v.vd.border}`, "background": `radial-gradient(600px 260px at 0% 0%, ${v.vd.wash}, transparent 70%), oklch(0.185 0.018 262 / 0.92)`, "boxShadow": `0 0 0 1px oklch(1 0 0 / 0.02), 0 30px 60px -30px ${v.vd.wash}`, "padding": "26px", "display": "flex", "flexDirection": "column", "gap": "22px"}}>
              {" "}
              <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "flex-start", "gap": "16px", "flexWrap": "wrap"}}>
                {" "}
                <div style={{"display": "flex", "flexDirection": "column", "gap": "10px", "minWidth": "0", "flex": "1 1 360px"}}>
                  {" "}
                  <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                    {v.T.callTitle}
                  </span>
                  {" "}
                  <div style={{"display": "flex", "alignItems": "center", "gap": "14px"}}>
                    {" "}{v.vdDot}{" "}
                    <span style={{"fontSize": "clamp(34px,4vw,48px)", "fontWeight": "400", "letterSpacing": "-0.04em", "lineHeight": "1", "color": v.vd.c}}>
                      {v.vd.word}
                    </span>
                    {" "}
                  </div>
                  {" "}
                  <span style={{"fontSize": "15px", "lineHeight": "1.5", "color": "oklch(0.96 0.005 250)", "maxWidth": "620px", "textWrap": "pretty"}}>
                    {v.vd.line}
                  </span>
                  {" "}
                </div>
                {" "}
                <div style={{"display": "flex", "flexDirection": "column", "gap": "8px", "alignItems": "flex-start", "width": "260px"}}>
                  {" "}
                  <div style={{"display": "flex", "gap": "2px", "padding": "3px", "borderRadius": "12px", "background": "oklch(1 0 0 / 0.04)", "border": "1px solid oklch(1 0 0 / 0.07)"}}>
                    {" "}
                    {(v.vdScale || []).map((sc: any, _i1: number) => (
                      <Fragment key={_i1}>
                        <button onClick={sc.pick} style={{"border": "0", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "13px", "padding": "8px 16px", "borderRadius": "9px", "display": "flex", "alignItems": "center", "gap": "8px", "background": sc.bg, "color": sc.fg, "transition": "background .2s,color .2s"}}>
                          <span style={{"width": "7px", "height": "7px", "borderRadius": "50%", "background": sc.dot, "boxShadow": sc.glow}} />
                          {sc.label}
                        </button>
                      </Fragment>
                    ))}
                    {" "}
                  </div>
                  {" "}
                  <span style={{"fontSize": "11px", "color": v.vd.ovc}}>
                    {v.vd.ov}
                  </span>
                  {" "}
                </div>
                {" "}
              </div>
              {" "}
              <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,150px),1fr))", "gap": "10px"}}>
                {" "}
                {(v.signals || []).map((sg: any, _i1: number) => (
                  <Fragment key={_i1}>
                    {" "}
                    <button onClick={sg.go} style={{"cursor": "pointer", "textAlign": "left", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "borderRadius": "14px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "oklch(1 0 0 / 0.025)", "padding": "12px 14px", "display": "flex", "flexDirection": "column", "gap": "5px", "minWidth": "0"}}>
                      {" "}
                      <span style={{"display": "flex", "alignItems": "center", "gap": "7px", "fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                        <span style={{"width": "6px", "height": "6px", "borderRadius": "50%", "background": sg.c, "boxShadow": `0 0 6px ${sg.c}`}} />
                        {sg.k}
                      </span>
                      {" "}
                      <span style={{"fontSize": "22px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.02em", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums"}}>
                        {sg.v}
                        <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                          {" "}{sg.u}
                        </span>
                      </span>
                      {" "}
                      <span style={{"fontSize": "11.5px", "color": sg.c}}>
                        {sg.note}
                      </span>
                      {" "}
                    </button>
                    {" "}
                  </Fragment>
                ))}
                {" "}
              </div>
              {" "}
              <div style={{"display": "flex", "flexDirection": "column", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "paddingTop": "6px"}}>
                {" "}
                <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "baseline", "gap": "10px", "flexWrap": "wrap", "padding": "10px 0 4px"}}>
                  <span style={{"fontSize": "13px", "color": "oklch(0.96 0.005 250)"}}>
                    {v.vd.planTitle}
                  </span>
                  <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                    {v.vd.why}
                  </span>
                </div>
                {" "}
                {(v.vdPlan || []).map((p: any, _i1: number) => (
                  <Fragment key={_i1}>
                    {" "}
                    <div style={{"display": "grid", "gridTemplateColumns": "64px 1fr auto", "gap": "14px", "alignItems": "center", "padding": "13px 0", "borderTop": "1px solid oklch(1 0 0 / 0.07)"}}>
                      {" "}
                      <span style={{"fontSize": "12px", "fontWeight": "500", "color": v.vd.c, "letterSpacing": "0.04em"}}>
                        {p.sport}
                      </span>
                      {" "}
                      <div style={{"minWidth": "0"}}>
                        <div style={{"fontSize": "15px", "color": "oklch(0.96 0.005 250)"}}>
                          {p.title}
                        </div>
                        <div style={{"fontSize": "13px", "color": "oklch(0.74 0.015 255)", "marginTop": "3px"}}>
                          {p.detail}
                        </div>
                      </div>
                      {" "}
                      <span style={{"fontSize": "13px", "color": "oklch(0.74 0.015 255)", "fontVariantNumeric": "tabular-nums"}}>
                        {p.time}
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
            <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,420px),1fr))", "gap": "16px", "alignItems": "stretch"}}>
              <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
                <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                  <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                    {"Priorities"}
                  </div>
                  <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                    {v.prioMeta}
                  </span>
                </div>
                {" "}
                <div style={{"display": "flex", "flexDirection": "column", "gap": "12px"}}>
                  {" "}
                  {(v.prio || []).map((pr: any, _i1: number) => (
                    <Fragment key={_i1}>
                      {" "}
                      <div style={{"display": "flex", "flexDirection": "column", "gap": "10px", "padding": "14px 16px", "borderRadius": "14px", "border": `1px solid ${pr.bc}`, "background": "oklch(1 0 0 / 0.02)"}}>
                        {" "}
                        <div style={{"display": "flex", "gap": "12px", "alignItems": "flex-start"}}>
                          {" "}
                          <span style={{"fontSize": "12px", "color": pr.c, "fontVariantNumeric": "tabular-nums", "paddingTop": "2px"}}>
                            {pr.n}
                          </span>
                          {" "}
                          <div style={{"flex": "1", "display": "flex", "flexDirection": "column", "gap": "4px", "minWidth": "0"}}>
                            <span style={{"fontSize": "14.5px", "color": "oklch(0.96 0.005 250)"}}>
                              {pr.title}
                            </span>
                            <span style={{"fontSize": "12.5px", "lineHeight": "1.5", "color": "oklch(0.74 0.015 255)", "textWrap": "pretty"}}>
                              {pr.why}
                            </span>
                          </div>
                          {" "}
                        </div>
                        {" "}
                        <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "10px", "flexWrap": "wrap", "paddingLeft": "22px"}}>
                          {" "}
                          <span style={{"fontSize": "12.5px", "color": pr.c, "flex": "1 1 240px"}}>
                            {"→ "}{pr.act}
                          </span>
                          {" "}
                          <div style={{"display": "flex", "gap": "6px"}}>
                            <button onClick={pr.done} style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "5px 10px", "borderRadius": "8px", "border": "1px solid oklch(0.78 0.15 160 / 0.4)", "background": "transparent", "color": "oklch(0.78 0.15 160)"}}>
                              {"Done"}
                            </button>
                            <button onClick={pr.snooze} style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "5px 10px", "borderRadius": "8px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "transparent", "color": "oklch(0.74 0.015 255)"}}>
                              {"Snooze"}
                            </button>
                            <button onClick={pr.dismiss} style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "5px 10px", "borderRadius": "8px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "transparent", "color": "oklch(0.58 0.015 255)"}}>
                              {"Dismiss"}
                            </button>
                          </div>
                          {" "}
                        </div>
                        {" "}
                      </div>
                      {" "}
                    </Fragment>
                  ))}
                  {" "}
                  {v.prioEmpty ? (<>
                    <div style={{"fontSize": "13px", "color": "oklch(0.58 0.015 255)", "padding": "12px 0"}}>
                      {"Queue clear. Nice work."}
                    </div>
                  </>) : null}
                  {" "}
                </div>
                {" "}
                <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "10px", "flexWrap": "wrap", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "paddingTop": "12px"}}>
                  <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                    {v.prioQueued}
                  </span>
                  <button onClick={v.prioReset} style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "0", "border": "0", "background": "transparent", "color": "oklch(0.82 0.13 210)"}}>
                    {v.prioResetT}
                  </button>
                </div>
                {" "}
              </section>
              <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
                <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                  <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                    {"Muscle load · 30 days"}
                  </div>
                  <button onClick={v.go.body} style={{"border": "0", "background": "transparent", "cursor": "pointer", "padding": "0", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "color": "oklch(0.82 0.13 210)"}}>
                    {"Open →"}
                  </button>
                </div>
                {" "}
                <div style={{"display": "flex", "gap": "4px", "alignItems": "flex-end"}}>
                  <div style={{"display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "12px", "minWidth": "0", "flex": "1"}}>
                    {" "}
                    <div style={{"position": "relative", "width": "100%", "height": "280px", "display": "flex", "alignItems": "flex-end", "justifyContent": "center"}}>
                      {" "}
                      <div style={{"position": "absolute", "bottom": "0", "left": "50%", "transform": "translateX(-50%)", "width": "84%", "height": "31px", "borderRadius": "50%", "border": "1px solid oklch(0.82 0.13 210 / 0.35)", "boxShadow": "0 0 30px oklch(0.82 0.13 210 / 0.25), inset 0 0 20px oklch(0.82 0.13 210 / 0.2)"}} />
                      {" "}
                      <div style={{"position": "absolute", "bottom": "7px", "left": "50%", "transform": "translateX(-50%)", "width": "60%", "height": "18px", "borderRadius": "50%", "border": "1.5px solid oklch(0.82 0.13 210 / 0.7)", "boxShadow": "0 0 18px oklch(0.82 0.13 210 / 0.6)"}} />
                      {" "}
                      <div style={{"position": "relative", "height": "258px", "aspectRatio": "1 / 2.1", "marginBottom": "14px"}}>
                        {" "}
                        <svg viewBox="-4 -4 108 222" preserveAspectRatio="xMidYMax meet" style={{"position": "absolute", "inset": "0", "width": "100%", "height": "100%", "overflow": "visible", "pointerEvents": "none"}}>
                          {(v.front || []).map((s: any, _i1: number) => (
                            <Fragment key={_i1}>
                              <polygon points={s.pts} fill={s.fill} fillOpacity={s.fo} stroke={s.stroke} strokeOpacity={s.fo} strokeWidth="0.8" strokeLinejoin="round" onMouseEnter={s.enter} onMouseLeave={v.leave} style={{"pointerEvents": s.pe, "cursor": "pointer", "transition": "fill .4s, opacity .2s", "opacity": s.op, "filter": s.glow}} />
                            </Fragment>
                          ))}
                        </svg>
                        {" "}
                      </div>
                      {" "}
                    </div>
                    {" "}
                  </div>
                  <div style={{"display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "12px", "minWidth": "0", "flex": "1"}}>
                    {" "}
                    <div style={{"position": "relative", "width": "100%", "height": "280px", "display": "flex", "alignItems": "flex-end", "justifyContent": "center"}}>
                      {" "}
                      <div style={{"position": "absolute", "bottom": "0", "left": "50%", "transform": "translateX(-50%)", "width": "84%", "height": "31px", "borderRadius": "50%", "border": "1px solid oklch(0.82 0.13 210 / 0.35)", "boxShadow": "0 0 30px oklch(0.82 0.13 210 / 0.25), inset 0 0 20px oklch(0.82 0.13 210 / 0.2)"}} />
                      {" "}
                      <div style={{"position": "absolute", "bottom": "7px", "left": "50%", "transform": "translateX(-50%)", "width": "60%", "height": "18px", "borderRadius": "50%", "border": "1.5px solid oklch(0.82 0.13 210 / 0.7)", "boxShadow": "0 0 18px oklch(0.82 0.13 210 / 0.6)"}} />
                      {" "}
                      <div style={{"position": "relative", "height": "258px", "aspectRatio": "1 / 2.1", "marginBottom": "14px"}}>
                        {" "}
                        <svg viewBox="-4 -4 108 228" preserveAspectRatio="xMidYMax meet" style={{"position": "absolute", "inset": "0", "width": "100%", "height": "100%", "overflow": "visible", "pointerEvents": "none"}}>
                          {(v.back || []).map((s: any, _i1: number) => (
                            <Fragment key={_i1}>
                              <polygon points={s.pts} fill={s.fill} fillOpacity={s.fo} stroke={s.stroke} strokeOpacity={s.fo} strokeWidth="0.8" strokeLinejoin="round" onMouseEnter={s.enter} onMouseLeave={v.leave} style={{"pointerEvents": s.pe, "cursor": "pointer", "transition": "fill .4s, opacity .2s", "opacity": s.op, "filter": s.glow}} />
                            </Fragment>
                          ))}
                        </svg>
                        {" "}
                      </div>
                      {" "}
                    </div>
                    {" "}
                  </div>
                </div>
                {" "}
                <div style={{"display": "flex", "flexDirection": "column", "gap": "12px"}}>
                  {(v.bodyNotes || []).map((i: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <div style={{"display": "flex", "gap": "12px", "alignItems": "flex-start"}}>
                        <span style={{"width": "6px", "height": "6px", "borderRadius": "50%", "marginTop": "7px", "flex": "none", "background": i.dot, "boxShadow": `0 0 8px ${i.dot}`}} />
                        <span style={{"flex": "1", "fontSize": "13px", "lineHeight": "1.55", "color": "oklch(0.96 0.005 250)", "textWrap": "pretty"}}>
                          {i.text}
                        </span>
                        {i.go ? (<>
                          <button onClick={i.go} style={{"border": "0", "background": "transparent", "cursor": "pointer", "padding": "2px 0 0", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "color": "oklch(0.82 0.13 210)", "whiteSpace": "nowrap"}}>
                            {i.page}{" →"}
                          </button>
                        </>) : null}
                      </div>
                    </Fragment>
                  ))}
                </div>
              </section>
            </div>
            <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,280px),1fr))", "gap": "16px", "alignItems": "stretch"}}>
              <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
                <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                  <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                    {"Blood watchlist"}
                  </div>
                  <button onClick={v.go.blood} style={{"border": "0", "background": "transparent", "cursor": "pointer", "padding": "0", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "color": "oklch(0.82 0.13 210)"}}>
                    {"Open →"}
                  </button>
                </div>
                {" "}
                <div style={{"display": "flex", "flexDirection": "column"}}>
                  {" "}
                  {(v.watch || []).map((r: any, _i1: number) => (
                    <Fragment key={_i1}>
                      {" "}
                      <div style={{"display": "grid", "gridTemplateColumns": "1fr auto 32px", "gap": "12px", "alignItems": "center", "padding": "9px 0", "borderTop": "1px solid oklch(1 0 0 / 0.07)"}}>
                        {" "}
                        <span style={{"fontSize": "13px", "color": "oklch(0.96 0.005 250)"}}>
                          {r.name}
                        </span>
                        {" "}
                        <span style={{"fontSize": "13px", "color": r.c, "fontVariantNumeric": "tabular-nums"}}>
                          {r.v}
                        </span>
                        {" "}
                        <div style={{"display": "flex", "alignItems": "flex-end", "gap": "3px", "height": "22px", "width": "32px", "flex": "none"}}>
                          {(r.trend || []).map((tb: any, _i2: number) => (
                            <Fragment key={_i2}>
                              <div style={{"flex": "1", "height": tb.h, "borderRadius": "2px", "background": tb.c}} />
                            </Fragment>
                          ))}
                        </div>
                        {" "}
                      </div>
                      {" "}
                    </Fragment>
                  ))}
                  {" "}
                </div>
                {" "}
                <div style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                  {v.T.drawSeq}
                </div>
              </section>
              <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
                <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                  <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                    {"Body composition"}
                  </div>
                  <button onClick={v.go.body} style={{"border": "0", "background": "transparent", "cursor": "pointer", "padding": "0", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "color": "oklch(0.82 0.13 210)"}}>
                    {"Open →"}
                  </button>
                </div>
                {" "}
                <div style={{"display": "flex", "alignItems": "baseline", "gap": "6px"}}>
                  <span style={{"fontSize": "36px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.04em", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums"}}>
                    {v.T.bf}
                  </span>
                  <span style={{"fontSize": "13px", "color": "oklch(0.58 0.015 255)"}}>
                    {"% body fat"}
                  </span>
                  <span style={{"fontSize": "12px", "color": "oklch(0.78 0.15 160)", "marginLeft": "auto"}}>
                    {v.T.bfDelta}
                  </span>
                </div>
                {" "}
                <div style={{"display": "flex", "alignItems": "flex-end", "gap": "10px", "height": "110px"}}>
                  {(v.bfBars || []).map((b: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <div style={{"flex": "1", "display": "flex", "flexDirection": "column", "alignItems": "stretch", "gap": "6px", "height": "100%", "justifyContent": "flex-end", "minWidth": "0"}}>
                        <div style={{"fontSize": "11px", "color": "oklch(0.74 0.015 255)", "textAlign": "center", "fontVariantNumeric": "tabular-nums"}}>
                          {b.v}
                        </div>
                        <div style={{"height": b.h, "borderRadius": "5px 5px 2px 2px", "background": b.c, "boxShadow": b.glow, "transition": "height .4s"}} />
                        <div style={{"fontSize": "11px", "color": "oklch(0.58 0.015 255)", "textAlign": "center", "whiteSpace": "nowrap", "overflow": "hidden"}}>
                          {b.l}
                        </div>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </>) : null}
        {" "}
        {v.show.week ? (<>
          <div data-screen-label="week" style={{"display": "flex", "flexDirection": "column", "gap": "16px"}}>
            <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,150px),1fr))", "gap": "12px"}}>
              {" "}
              {(v.wkBudget || []).map((b: any, _i1: number) => (
                <Fragment key={_i1}>
                  {" "}
                  <div style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "14px 16px", "display": "flex", "flexDirection": "column", "gap": "8px"}}>
                    {" "}
                    <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                      {b.k}
                    </span>
                    {" "}
                    <span style={{"fontSize": "24px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums"}}>
                      {b.done}
                      <span style={{"fontSize": "13px", "color": "oklch(0.58 0.015 255)"}}>
                        {" / "}{b.goal}
                      </span>
                    </span>
                    {" "}
                    <div style={{"height": "4px", "borderRadius": "2px", "background": "oklch(1 0 0 / 0.07)"}}>
                      <div style={{"height": "100%", "width": b.pct, "borderRadius": "2px", "background": b.c, "boxShadow": `0 0 8px ${b.c}`}} />
                    </div>
                    {" "}
                    <span style={{"fontSize": "11.5px", "color": b.nc}}>
                      {b.note}
                    </span>
                    {" "}
                  </div>
                  {" "}
                </Fragment>
              ))}
              {" "}
            </div>
            {" "}
            <WeekPlan wk={v.wk} days={v.wkDays || []} />
            {" "}
          </div>
        </>) : null}
        {" "}
        {" "}
        {v.show.roadmap ? (<>
          {v.rmEmpty ? (<RoadmapPage D={v.D} />) : (<RoadmapView v={v} />)}
        </>) : null}
        {" "}
        {v.show.training ? (<>
          <div data-screen-label="training" style={{"display": "flex", "flexDirection": "column", "gap": "16px"}}>
            <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,128px),1fr))", "gap": "12px"}}>
              {(v.trainKpis || []).map((x: any, _i1: number) => (
                <Fragment key={_i1}>
                  <button onClick={x.go} style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "cursor": x.cur, "textAlign": "left", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "padding": "16px 18px", "display": "flex", "flexDirection": "column", "gap": "6px", "minWidth": "0"}}>
                    <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                      {x.k}
                    </span>
                    <span style={{"display": "flex", "alignItems": "baseline", "gap": "5px", "flexWrap": "wrap"}}>
                      <span style={{"fontSize": "28px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.03em", "color": x.c, "fontVariantNumeric": "tabular-nums"}}>
                        {x.v}
                      </span>
                      <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                        {x.u}
                      </span>
                    </span>
                    <span style={{"fontSize": "12px", "color": x.nc}}>
                      {x.note}
                    </span>
                  </button>
                </Fragment>
              ))}
            </div>
            <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
              <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                  {"Weekly volume · last 12 weeks"}
                </div>
                <div style={{"display": "flex", "gap": "2px", "padding": "3px", "borderRadius": "10px", "background": "oklch(1 0 0 / 0.04)", "border": "1px solid oklch(1 0 0 / 0.07)", "flexWrap": "wrap"}}>
                  {(v.tMetric || []).map((o: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <button onClick={o.pick} style={{"border": "0", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "6px 12px", "borderRadius": "7px", "background": o.bg, "color": o.fg, "transition": "background .2s,color .2s"}}>
                        {o.label}
                      </button>
                    </Fragment>
                  ))}
                </div>
              </div>
              <div style={{"display": "flex", "alignItems": "flex-end", "gap": "8px", "height": "200px"}}>
                {(v.weeks || []).map((b: any, _i1: number) => (
                  <Fragment key={_i1}>
                    <div style={{"flex": "1", "display": "flex", "flexDirection": "column", "alignItems": "stretch", "gap": "6px", "height": "100%", "justifyContent": "flex-end", "minWidth": "0"}}>
                      <div style={{"fontSize": "11px", "color": "oklch(0.74 0.015 255)", "textAlign": "center", "fontVariantNumeric": "tabular-nums", "whiteSpace": "nowrap"}}>
                        {b.v}
                      </div>
                      <div style={{"height": b.h, "borderRadius": "5px 5px 2px 2px", "background": b.c, "boxShadow": b.glow, "transition": "height .4s"}} />
                      <div style={{"fontSize": "11px", "color": "oklch(0.58 0.015 255)", "textAlign": "center", "whiteSpace": "nowrap", "overflow": "hidden"}}>
                        {b.l}
                      </div>
                    </div>
                  </Fragment>
                ))}
              </div>
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {v.tMetricNote}
              </span>
            </section>
            <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,380px),1fr))", "gap": "16px", "alignItems": "stretch"}}>
              <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
                <div style={{"display": "flex", "flexDirection": "column", "gap": "4px"}}>
                  <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                    {"Consistency"}
                  </div>
                </div>
                {" "}
                <div style={{"display": "flex", "flexWrap": "wrap", "gap": "18px 40px", "alignItems": "flex-start"}}>
                <div style={{"display": "flex", "flexDirection": "column", "gap": "18px", "flex": "0 1 auto", "minWidth": "0", "maxWidth": "100%"}}>
                <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)", "marginBottom": "-6px"}}>
                  {"Last 16 weeks · swim, bike, run and strength minutes"}
                </span>
                <div style={{"display": "flex", "gap": "10px", "overflowX": "auto"}}>
                  {" "}
                  <div style={{"display": "grid", "gridTemplateRows": "repeat(7,16px)", "gap": "4px", "fontSize": "10px", "color": "oklch(0.58 0.015 255)"}}>
                    <span>
                      {"M"}
                    </span>
                    <span />
                    <span>
                      {"W"}
                    </span>
                    <span />
                    <span>
                      {"F"}
                    </span>
                    <span />
                    <span>
                      {"S"}
                    </span>
                  </div>
                  {" "}
                  <div style={{"display": "grid", "gridTemplateRows": "repeat(7,16px)", "gridAutoFlow": "column", "gridAutoColumns": "16px", "gap": "4px"}}>
                    {" "}
                    {(v.heat || []).map((hc: any, _i1: number) => (
                      <Fragment key={_i1}>
                        <div title={hc.t} style={{"borderRadius": "4px", "background": hc.c, "boxShadow": hc.g, "border": hc.b}} />
                      </Fragment>
                    ))}
                    {" "}
                  </div>
                  {" "}
                </div>
                {" "}
                <div style={{"display": "flex", "gap": "8px", "alignItems": "center", "fontSize": "11px", "color": "oklch(0.58 0.015 255)"}}>
                  <span>
                    {"Less"}
                  </span>
                  <span style={{"width": "12px", "height": "12px", "borderRadius": "3px", "background": "oklch(1 0 0 / 0.05)"}} />
                  <span style={{"width": "12px", "height": "12px", "borderRadius": "3px", "background": "oklch(0.82 0.13 210 / 0.25)"}} />
                  <span style={{"width": "12px", "height": "12px", "borderRadius": "3px", "background": "oklch(0.82 0.13 210 / 0.55)"}} />
                  <span style={{"width": "12px", "height": "12px", "borderRadius": "3px", "background": "oklch(0.82 0.13 210)"}} />
                  <span>
                    {"More"}
                  </span>
                  <span style={{"marginLeft": "8px", "width": "12px", "height": "12px", "borderRadius": "3px", "border": "1px dashed oklch(1 0 0 / 0.2)"}} />
                  <span>
                    {"Walk only"}
                  </span>
                </div>
                {" "}
                </div>
                <div style={{"display": "flex", "flexDirection": "column", "gap": "12px", "flex": "1 1 260px", "minWidth": "0"}}>
                  {" "}
                  <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                    {v.T.todTitle}
                  </span>
                  {" "}
                  {(v.tod || []).map((d: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <div style={{"display": "flex", "flexDirection": "column", "gap": "8px"}}>
                        <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "baseline", "gap": "8px"}}>
                          <span style={{"fontSize": "13px", "color": "oklch(0.74 0.015 255)"}}>
                            {d.name}
                          </span>
                          <span style={{"fontSize": "13px", "fontVariantNumeric": "tabular-nums", "whiteSpace": "nowrap"}}>
                            <span style={{"color": "oklch(0.96 0.005 250)"}}>
                              {d.done}
                            </span>
                            <span style={{"color": "oklch(0.58 0.015 255)"}}>
                              {" / "}{d.goal}
                            </span>
                          </span>
                        </div>
                        <div style={{"height": "4px", "borderRadius": "2px", "background": "oklch(1 0 0 / 0.07)"}}>
                          <div style={{"height": "100%", "width": d.pct, "borderRadius": "2px", "background": "oklch(0.82 0.13 210)", "boxShadow": "0 0 10px oklch(0.82 0.13 210 / 0.5)"}} />
                        </div>
                      </div>
                    </Fragment>
                  ))}
                  {" "}
                </div>
                </div>
              </section>
            </div>
            <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
              <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                  {v.T.sportTitle}
                </div>
                <div style={{"display": "flex", "gap": "2px", "padding": "3px", "borderRadius": "10px", "background": "oklch(1 0 0 / 0.04)", "border": "1px solid oklch(1 0 0 / 0.07)", "flexWrap": "wrap"}}>
                  {(v.sportOpts || []).map((o: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <button onClick={o.pick} style={{"border": "0", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "6px 12px", "borderRadius": "7px", "background": o.bg, "color": o.fg, "transition": "background .2s,color .2s"}}>
                        {o.label}
                      </button>
                    </Fragment>
                  ))}
                </div>
              </div>
              <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,128px),1fr))", "gap": "12px"}}>
                {(v.sportTiles || []).map((x: any, _i1: number) => (
                  <Fragment key={_i1}>
                    <button onClick={x.go} style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "cursor": x.cur, "textAlign": "left", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "padding": "16px 18px", "display": "flex", "flexDirection": "column", "gap": "6px", "minWidth": "0"}}>
                      <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                        {x.k}
                      </span>
                      <span style={{"display": "flex", "alignItems": "baseline", "gap": "5px", "flexWrap": "wrap"}}>
                        <span style={{"fontSize": "28px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.03em", "color": x.c, "fontVariantNumeric": "tabular-nums"}}>
                          {x.v}
                        </span>
                        <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                          {x.u}
                        </span>
                      </span>
                      <span style={{"fontSize": "12px", "color": x.nc}}>
                        {x.note}
                      </span>
                    </button>
                  </Fragment>
                ))}
              </div>
              {" "}
              <div style={{"display": "flex", "flexDirection": "column", "gap": "10px"}}>
                {" "}
                <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                  {v.sportChartLabel}
                </span>
                {" "}
                <div style={{"display": "flex", "alignItems": "flex-end", "gap": "8px", "height": "150px"}}>
                  {(v.sportBars || []).map((b: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <div style={{"flex": "1", "display": "flex", "flexDirection": "column", "alignItems": "stretch", "gap": "6px", "height": "100%", "justifyContent": "flex-end", "minWidth": "0"}}>
                        <div style={{"fontSize": "11px", "color": "oklch(0.74 0.015 255)", "textAlign": "center", "fontVariantNumeric": "tabular-nums", "whiteSpace": "nowrap"}}>
                          {b.v}
                        </div>
                        <div style={{"height": b.h, "borderRadius": "5px 5px 2px 2px", "background": b.c, "boxShadow": b.glow, "transition": "height .4s"}} />
                        <div style={{"fontSize": "11px", "color": "oklch(0.58 0.015 255)", "textAlign": "center", "whiteSpace": "nowrap", "overflow": "hidden"}}>
                          {b.l}
                        </div>
                      </div>
                    </Fragment>
                  ))}
                </div>
                {" "}
              </div>
              {" "}
              <div style={{"display": "flex", "flexDirection": "column"}}>
                {" "}
                <div className="sport-row" style={{"display": "grid", "gridTemplateColumns": v.sportGrid, "gap": "12px", "padding": "0 0 8px", "fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                  {" "}
                  {(v.sportCols || []).map((hc2: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <span style={{"textAlign": hc2.a}}>
                        {hc2.t}
                      </span>
                    </Fragment>
                  ))}
                  {" "}
                </div>
                {" "}
                {(v.sportRows || []).map((sr: any, _i1: number) => (
                  <Fragment key={_i1}>
                    {" "}
                    <div className="sport-row" style={{"display": "grid", "gridTemplateColumns": v.sportGrid, "gap": "12px", "padding": "10px 0", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "fontSize": "13px", "fontVariantNumeric": "tabular-nums"}}>
                      {" "}
                      {(sr.cells || []).map((ce: any, _i2: number) => (
                        <Fragment key={_i2}>
                          <span style={{"textAlign": ce.a, "color": ce.c, "whiteSpace": "nowrap", "overflow": "hidden", "textOverflow": "ellipsis"}}>
                            {ce.t}
                          </span>
                        </Fragment>
                      ))}
                      {" "}
                    </div>
                    {" "}
                  </Fragment>
                ))}
                {" "}
              </div>
            </section>
          </div>
        </>) : null}
        {" "}
        {v.show.body ? (<>
          <div data-screen-label="body" style={{"display": "flex", "flexDirection": "column", "gap": "16px"}}>
            <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "24px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
              <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                  {"Muscle load"}
                </div>
                <div style={{"display": "flex", "gap": "2px", "padding": "3px", "borderRadius": "10px", "background": "oklch(1 0 0 / 0.04)", "border": "1px solid oklch(1 0 0 / 0.07)", "flexWrap": "wrap"}}>
                  {(v.ranges || []).map((o: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <button onClick={o.pick} style={{"border": "0", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "6px 12px", "borderRadius": "7px", "background": o.bg, "color": o.fg, "transition": "background .2s,color .2s"}}>
                        {o.label}
                      </button>
                    </Fragment>
                  ))}
                </div>
              </div>
              {" "}
              <div style={{"display": "flex", "alignItems": "center", "gap": "10px", "flexWrap": "wrap"}}>
                {" "}
                <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                  {"Highlight split day"}
                </span>
                {" "}
                <div style={{"display": "flex", "gap": "6px", "flexWrap": "wrap"}}>
                  {(v.splitChips || []).map((sp: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <button onClick={sp.pick} style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "6px 12px", "borderRadius": "999px", "border": `1px solid ${sp.bc}`, "background": sp.bg, "color": sp.fg, "boxShadow": sp.glow, "transition": "all .2s"}}>
                        {sp.label}
                      </button>
                    </Fragment>
                  ))}
                </div>
                {" "}
              </div>
              {" "}
              <div style={{"display": "flex", "flexWrap": "wrap", "gap": "28px"}}>
                {" "}
                <div style={{"flex": "2 1 460px", "display": "flex", "gap": "8px", "alignItems": "flex-end", "minWidth": "0"}}>
                  <div style={{"display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "12px", "minWidth": "0", "flex": "1"}}>
                    {" "}
                    <div style={{"position": "relative", "width": "100%", "height": "500px", "overflowX": "clip", "display": "flex", "alignItems": "flex-end", "justifyContent": "center"}}>
                      {" "}
                      <div style={{"position": "absolute", "bottom": "0", "left": "50%", "transform": "translateX(-50%)", "width": "84%", "height": "55px", "borderRadius": "50%", "border": "1px solid oklch(0.82 0.13 210 / 0.35)", "boxShadow": "0 0 30px oklch(0.82 0.13 210 / 0.25), inset 0 0 20px oklch(0.82 0.13 210 / 0.2)"}} />
                      {" "}
                      <div style={{"position": "absolute", "bottom": "13px", "left": "50%", "transform": "translateX(-50%)", "width": "60%", "height": "33px", "borderRadius": "50%", "border": "1.5px solid oklch(0.82 0.13 210 / 0.7)", "boxShadow": "0 0 18px oklch(0.82 0.13 210 / 0.6)"}} />
                      {" "}
                      <div style={{"position": "relative", "height": "460px", "aspectRatio": "1 / 2.1", "marginBottom": "25px"}}>
                        {v.scanFront}{" "}
                        {v.isRender ? (<>

                        </>) : null}
                        {" "}
                        <svg viewBox="-4 -4 108 222" preserveAspectRatio="xMidYMax meet" style={{"position": "absolute", "inset": "0", "width": "100%", "height": "100%", "overflow": "visible", "pointerEvents": "none", "mixBlendMode": v.fv.blend, "transform": v.overlayTf, "transformOrigin": "50% 100%"}}>
                          {(v.front || []).map((s: any, _i1: number) => (
                            <Fragment key={_i1}>
                              <polygon points={s.pts} fill={s.fill} fillOpacity={s.fo} stroke={s.stroke} strokeOpacity={s.fo} strokeWidth="0.8" strokeLinejoin="round" onMouseEnter={s.enter} onMouseLeave={v.leave} style={{"pointerEvents": s.pe, "cursor": "pointer", "transition": "fill .4s, opacity .2s", "opacity": s.op, "filter": s.glow}} />
                            </Fragment>
                          ))}
                        </svg>
                        {" "}
                      </div>
                      {" "}
                    </div>
                    {" "}
                    <div style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                      {"Front"}
                      <span style={{"color": "oklch(0.58 0.015 255)"}}>
                        {v.fv.hint}
                      </span>
                    </div>
                    {" "}
                  </div>
                  <div style={{"display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "12px", "minWidth": "0", "flex": "1"}}>
                    {" "}
                    <div style={{"position": "relative", "width": "100%", "height": "500px", "overflowX": "clip", "display": "flex", "alignItems": "flex-end", "justifyContent": "center"}}>
                      {" "}
                      <div style={{"position": "absolute", "bottom": "0", "left": "50%", "transform": "translateX(-50%)", "width": "84%", "height": "55px", "borderRadius": "50%", "border": "1px solid oklch(0.82 0.13 210 / 0.35)", "boxShadow": "0 0 30px oklch(0.82 0.13 210 / 0.25), inset 0 0 20px oklch(0.82 0.13 210 / 0.2)"}} />
                      {" "}
                      <div style={{"position": "absolute", "bottom": "13px", "left": "50%", "transform": "translateX(-50%)", "width": "60%", "height": "33px", "borderRadius": "50%", "border": "1.5px solid oklch(0.82 0.13 210 / 0.7)", "boxShadow": "0 0 18px oklch(0.82 0.13 210 / 0.6)"}} />
                      {" "}
                      <div style={{"position": "relative", "height": "460px", "aspectRatio": "1 / 2.1", "marginBottom": "25px"}}>
                        {v.scanBack}{" "}
                        {v.isRender ? (<>

                        </>) : null}
                        {" "}
                        <svg viewBox="-4 -4 108 228" preserveAspectRatio="xMidYMax meet" style={{"position": "absolute", "inset": "0", "width": "100%", "height": "100%", "overflow": "visible", "pointerEvents": "none", "mixBlendMode": v.bv.blend, "transform": v.overlayTf, "transformOrigin": "50% 100%"}}>
                          {(v.back || []).map((s: any, _i1: number) => (
                            <Fragment key={_i1}>
                              <polygon points={s.pts} fill={s.fill} fillOpacity={s.fo} stroke={s.stroke} strokeOpacity={s.fo} strokeWidth="0.8" strokeLinejoin="round" onMouseEnter={s.enter} onMouseLeave={v.leave} style={{"pointerEvents": s.pe, "cursor": "pointer", "transition": "fill .4s, opacity .2s", "opacity": s.op, "filter": s.glow}} />
                            </Fragment>
                          ))}
                        </svg>
                        {" "}
                      </div>
                      {" "}
                    </div>
                    {" "}
                    <div style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                      {"Back"}
                      <span style={{"color": "oklch(0.58 0.015 255)"}}>
                        {v.bv.hint}
                      </span>
                    </div>
                    {" "}
                  </div>
                </div>
                {" "}
                <div style={{"flex": "1 1 260px", "display": "flex", "flexDirection": "column", "gap": "22px", "minWidth": "0"}}>
                  {" "}
                  <div style={{"display": "flex", "flexDirection": "column", "gap": "6px"}}>
                    {" "}
                    <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                      {v.focus.tag}
                    </span>
                    {" "}
                    <span style={{"fontSize": "22px", "color": "oklch(0.96 0.005 250)"}}>
                      {v.focus.name}
                    </span>
                    {" "}
                    <span style={{"display": "flex", "alignItems": "baseline", "gap": "6px"}}>
                      <span style={{"fontSize": "40px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.04em", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums"}}>
                        {v.focus.val}
                      </span>
                      <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                        {"weighted sets"}
                      </span>
                    </span>
                    {" "}
                    <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                      {v.focus.rank}
                    </span>
                    {" "}
                  </div>
                  {" "}
                  <div style={{"display": "flex", "flexDirection": "column", "gap": "10px"}}>
                    {" "}
                    <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                      {"By group · "}{v.meta}
                    </span>
                    {" "}
                    {(v.groups || []).map((g: any, _i1: number) => (
                      <Fragment key={_i1}>
                        {" "}
                        <div style={{"display": "grid", "gridTemplateColumns": "76px 1fr 44px", "gap": "10px", "alignItems": "center", "fontSize": "13px"}}>
                          {" "}
                          <span style={{"color": "oklch(0.74 0.015 255)"}}>
                            {g.name}
                          </span>
                          {" "}
                          <div style={{"height": "4px", "borderRadius": "2px", "background": "oklch(1 0 0 / 0.07)"}}>
                            <div style={{"height": "100%", "width": g.pct, "borderRadius": "2px", "background": g.fill, "transition": "width .4s"}} />
                          </div>
                          {" "}
                          <span style={{"fontSize": "12px", "textAlign": "right", "color": "oklch(0.74 0.015 255)", "fontVariantNumeric": "tabular-nums"}}>
                            {g.val}
                          </span>
                          {" "}
                        </div>
                        {" "}
                      </Fragment>
                    ))}
                    {" "}
                  </div>
                  {" "}
                  <div style={{"display": "flex", "flexDirection": "column", "gap": "12px"}}>
                    {(v.bodyNotes || []).map((i: any, _i1: number) => (
                      <Fragment key={_i1}>
                        <div style={{"display": "flex", "gap": "12px", "alignItems": "flex-start"}}>
                          <span style={{"width": "6px", "height": "6px", "borderRadius": "50%", "marginTop": "7px", "flex": "none", "background": i.dot, "boxShadow": `0 0 8px ${i.dot}`}} />
                          <span style={{"flex": "1", "fontSize": "13px", "lineHeight": "1.55", "color": "oklch(0.96 0.005 250)", "textWrap": "pretty"}}>
                            {i.text}
                          </span>
                          {i.go ? (<>
                            <button onClick={i.go} style={{"border": "0", "background": "transparent", "cursor": "pointer", "padding": "2px 0 0", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "color": "oklch(0.82 0.13 210)", "whiteSpace": "nowrap"}}>
                              {i.page}{" →"}
                            </button>
                          </>) : null}
                        </div>
                      </Fragment>
                    ))}
                  </div>
                  {" "}
                </div>
                {" "}
              </div>
            </section>
            {v.strainOn ? (<>
            <section data-screen-label="strain" style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "24px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
              <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                  {"Strain"}
                </div>
                <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                  {v.strain.sub}
                </span>
              </div>
              <div style={{"display": "flex", "flexWrap": "wrap", "gap": "18px", "alignItems": "stretch"}}>
                <div style={{"flex": "1 1 220px", "display": "flex", "flexDirection": "column", "gap": "10px", "justifyContent": "center", "minWidth": "0"}}>
                  <div style={{"display": "flex", "alignItems": "baseline", "gap": "10px"}}>
                    <span style={{"fontSize": "44px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.03em", "lineHeight": "1", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums"}}>
                      {v.strain.v}
                    </span>
                    <span style={{"fontSize": "13px", "color": "oklch(0.58 0.015 255)"}}>
                      {"of 21"}
                    </span>
                    <span style={{"fontSize": "11px", "fontWeight": "500", "letterSpacing": "0.14em", "textTransform": "uppercase", "color": v.strain.c, "marginLeft": "auto"}}>
                      {v.strain.word}
                    </span>
                  </div>
                  <div style={{"height": "6px", "borderRadius": "3px", "background": "oklch(1 0 0 / 0.07)", "overflow": "hidden"}}>
                    <div style={{"width": v.strain.fill, "height": "100%", "borderRadius": "3px", "background": "oklch(0.82 0.13 210)", "boxShadow": "0 0 10px oklch(0.82 0.13 210 / 0.6)", "transition": "width .4s"}} />
                  </div>
                </div>
                <div style={{"flex": "2 1 300px", "display": "grid", "gridTemplateColumns": "repeat(3,minmax(0,1fr))", "gap": "1px", "background": "oklch(1 0 0 / 0.07)", "borderRadius": "12px", "overflow": "hidden"}}>
                  {(v.strain.tiles || []).map((m: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <div style={{"background": "oklch(0.185 0.018 262)", "padding": "12px 14px", "display": "flex", "flexDirection": "column", "gap": "3px", "minWidth": "0"}}>
                        <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                          {m.k}
                        </span>
                        <span style={{"fontSize": "20px", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums"}}>
                          {m.v}
                        </span>
                        <span style={{"fontSize": "11px", "color": m.nc}}>
                          {m.note}
                        </span>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </div>
              <div style={{"display": "flex", "flexDirection": "column", "gap": "6px"}}>
                <div style={{"display": "flex", "alignItems": "flex-end", "gap": "3px", "height": "64px"}}>
                  {(v.strain.bars || []).map((b: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <div title={b.t} style={{"flex": "1", "minWidth": "0", "height": b.h, "borderRadius": "3px 3px 1px 1px", "background": b.c, "boxShadow": b.g, "outline": b.o}} />
                    </Fragment>
                  ))}
                </div>
                <div style={{"display": "flex", "justifyContent": "space-between", "fontSize": "11px", "color": "oklch(0.58 0.015 255)"}}>
                  <span>{v.strain.ax[0]}</span>
                  <span>{v.strain.ax[1]}</span>
                </div>
              </div>
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {"Daily strain on WHOOP's 0–21 scale: light under 10, moderate 10–13.9, high 14–17.9, all out 18+. Hover a bar for the day."}
              </span>
            </section>
            </>) : null}
            <section data-screen-label="lifts" style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "24px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
              {" "}
              <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                  {"Key lifts · estimated 1-rep max"}
                </div>
                <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                  {v.T.liftsSub}
                </span>
              </div>
              {" "}
              <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,250px),1fr))", "gap": "12px"}}>
                {" "}
                {(v.lifts || []).map((lf: any, _i1: number) => (
                  <Fragment key={_i1}>
                    {" "}
                    <div style={{"borderRadius": "14px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "oklch(1 0 0 / 0.02)", "padding": "14px 16px", "display": "flex", "flexDirection": "column", "gap": "10px", "minWidth": "0"}}>
                      {" "}
                      <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "baseline", "gap": "8px"}}>
                        <span style={{"fontSize": "13px", "color": "oklch(0.74 0.015 255)"}}>
                          {lf.k}
                        </span>
                        <span style={{"fontSize": "12px", "color": lf.dc, "fontVariantNumeric": "tabular-nums"}}>
                          {lf.delta}
                        </span>
                      </div>
                      {" "}
                      <div style={{"display": "flex", "alignItems": "baseline", "gap": "6px"}}>
                        <span style={{"fontSize": "28px", "fontWeight": "300", "letterSpacing": "-0.03em", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums"}}>
                          {lf.e1}
                        </span>
                        <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                          {"lb e1RM"}
                        </span>
                      </div>
                      {" "}
                      <div style={{"display": "flex", "alignItems": "flex-end", "gap": "5px", "height": "44px"}}>
                        {(lf.bars || []).map((b: any, _i2: number) => (
                          <Fragment key={_i2}>
                            <div title={b.t} style={{"flex": "1", "height": b.h, "borderRadius": "3px 3px 1px 1px", "background": b.c, "boxShadow": b.g}} />
                          </Fragment>
                        ))}
                      </div>
                      {" "}
                      <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)", "fontVariantNumeric": "tabular-nums"}}>
                        {lf.sub}
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
                {"Estimated with the Epley formula from sets of 12 reps or fewer."}
              </span>
              {" "}
            </section>
            {v.D?.body?.volume ? (<LiftVolume vol={v.D.body.volume} />) : null}
            <section data-screen-label="injuries" style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "24px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
              {" "}
              <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                  {"Injury log"}
                </div>
                <div style={{"display": "flex", "alignItems": "center", "gap": "10px"}}>
                  <span style={{"fontSize": "12px", "color": v.injSumC}}>
                    {v.injSum}
                  </span>
                  {v.injOpen ? null : (
                  <button onClick={v.injToggle} style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "5px 10px", "borderRadius": "8px", "border": "1px solid oklch(0.82 0.13 210 / 0.4)", "background": "oklch(0.82 0.13 210 / 0.1)", "color": "oklch(0.82 0.13 210)"}}>
                    {"Add injury"}
                  </button>
                  )}
                </div>
              </div>
              {" "}
              {v.injOpen ? (
              <div style={{"display": "flex", "flexDirection": "column", "gap": "14px", "padding": "16px", "borderRadius": "14px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "oklch(1 0 0 / 0.02)"}}>
                {" "}
                <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,180px),1fr))", "gap": "12px"}}>
                  {" "}
                  <label style={{"display": "flex", "flexDirection": "column", "gap": "6px"}}>
                    <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                      {"Body area"}
                    </span>
                    <select value={v.injF.area} onChange={v.injSetArea} style={{"fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "13px", "color": "oklch(0.96 0.005 250)", "background": "oklch(1 0 0 / 0.04)", "border": "1px solid oklch(1 0 0 / 0.07)", "borderRadius": "9px", "padding": "9px 11px", "outline": "none", "minWidth": "0"}}>
                      {(v.injAreas || []).map((ar: any, _i1: number) => (
                        <Fragment key={_i1}>
                          <option value={ar}>
                            {ar}
                          </option>
                        </Fragment>
                      ))}
                    </select>
                  </label>
                  {" "}
                  <label style={{"display": "flex", "flexDirection": "column", "gap": "6px"}}>
                    <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                      {"Started"}
                    </span>
                    <input type="date" value={v.injF.date} onChange={v.injSetDate} style={{"fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "13px", "color": "oklch(0.96 0.005 250)", "background": "oklch(1 0 0 / 0.04)", "border": "1px solid oklch(1 0 0 / 0.07)", "borderRadius": "9px", "padding": "9px 11px", "outline": "none", "minWidth": "0", "colorScheme": "dark"}} />
                  </label>
                  {" "}
                  <div style={{"display": "flex", "flexDirection": "column", "gap": "6px"}}>
                    <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                      {"Side"}
                    </span>
                    <div style={{"display": "flex", "gap": "4px", "flexWrap": "wrap"}}>
                      {(v.injSides || []).map((o: any, _i1: number) => (
                        <Fragment key={_i1}>
                          <button onClick={o.pick} style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "7px 11px", "borderRadius": "8px", "border": `1px solid ${o.bc}`, "background": o.bg, "color": o.fg}}>
                            {o.label}
                          </button>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                  {" "}
                  <div style={{"display": "flex", "flexDirection": "column", "gap": "6px"}}>
                    <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                      {"Severity"}
                    </span>
                    <div style={{"display": "flex", "gap": "4px", "flexWrap": "wrap"}}>
                      {(v.injSevs || []).map((o: any, _i1: number) => (
                        <Fragment key={_i1}>
                          <button onClick={o.pick} style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "7px 11px", "borderRadius": "8px", "border": `1px solid ${o.bc}`, "background": o.bg, "color": o.fg}}>
                            {o.label}
                          </button>
                        </Fragment>
                      ))}
                    </div>
                  </div>
                  {" "}
                </div>
                {" "}
                <label style={{"display": "flex", "flexDirection": "column", "gap": "6px"}}>
                  <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                    {"What happened · what aggravates it"}
                  </span>
                  <input type="text" value={v.injF.note} onChange={v.injSetNote} placeholder="e.g. tight on stairs after Thursday's run, fine when walking" style={{"fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "13px", "color": "oklch(0.96 0.005 250)", "background": "oklch(1 0 0 / 0.04)", "border": "1px solid oklch(1 0 0 / 0.07)", "borderRadius": "9px", "padding": "9px 11px", "outline": "none", "minWidth": "0"}} />
                </label>
                {" "}
                <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                  <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                    {"Active injuries are outlined in red on the muscle map and switch today's call to rest when moderate or severe."}
                  </span>
                  <div style={{"display": "flex", "gap": "8px"}}>
                  <button onClick={v.injToggle} style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "13px", "padding": "9px 14px", "borderRadius": "10px", "border": "1px solid oklch(1 0 0 / 0.1)", "background": "transparent", "color": "oklch(0.74 0.015 255)"}}>
                    {"Cancel"}
                  </button>
                  <button onClick={v.injAdd} style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "13px", "padding": "9px 16px", "borderRadius": "10px", "border": "1px solid oklch(0.82 0.13 210 / 0.5)", "background": "oklch(0.82 0.13 210 / 0.14)", "color": "oklch(0.82 0.13 210)"}}>
                    {"Add to log"}
                  </button>
                  </div>
                </div>
                {" "}
              </div>
              ) : null}
              {" "}
              {v.injEmpty ? (<>
                <div style={{"fontSize": "13px", "color": "oklch(0.58 0.015 255)", "padding": "6px 0"}}>
                  {"No injuries logged. Log one as soon as something feels off, even if it's minor. Patterns show up over time."}
                </div>
              </>) : null}
              {" "}
              <div style={{"display": "flex", "flexDirection": "column"}}>
                {" "}
                {(v.injList || []).map((ij: any, _i1: number) => (
                  <Fragment key={_i1}>
                    {" "}
                    <div className="inj-row" style={{"display": "grid", "gridTemplateColumns": "minmax(0,1.4fr) minmax(0,1fr) auto", "gap": "14px", "alignItems": "center", "padding": "13px 0", "borderTop": "1px solid oklch(1 0 0 / 0.07)"}}>
                      {" "}
                      <div style={{"display": "flex", "gap": "10px", "alignItems": "flex-start", "minWidth": "0"}}>
                        <span style={{"width": "8px", "height": "8px", "borderRadius": "50%", "marginTop": "6px", "flex": "none", "background": ij.c, "boxShadow": `0 0 8px ${ij.c}`}} />
                        <div style={{"display": "flex", "flexDirection": "column", "gap": "3px", "minWidth": "0"}}>
                          <span style={{"fontSize": "14px", "color": "oklch(0.96 0.005 250)"}}>
                            {ij.title}
                          </span>
                          <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)", "lineHeight": "1.45"}}>
                            {ij.note}
                          </span>
                        </div>
                      </div>
                      {" "}
                      <div style={{"display": "flex", "flexDirection": "column", "gap": "3px", "fontVariantNumeric": "tabular-nums"}}>
                        <span style={{"fontSize": "12.5px", "color": ij.c}}>
                          {ij.st}
                        </span>
                        <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                          {ij.when}
                        </span>
                      </div>
                      {" "}
                      <div style={{"display": "flex", "gap": "4px", "flexWrap": "wrap", "justifyContent": "flex-end"}}>
                        {(ij.acts || []).map((ia: any, _i2: number) => (
                          <Fragment key={_i2}>
                            <button onClick={ia.go} style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "11.5px", "padding": "5px 9px", "borderRadius": "7px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": ia.bg, "color": ia.fg}}>
                              {ia.t}
                            </button>
                          </Fragment>
                        ))}
                      </div>
                      {" "}
                    </div>
                    {" "}
                  </Fragment>
                ))}
                {" "}
              </div>
              {" "}
            </section>
            <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "24px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
              <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                  {"Body composition · DEXA"}
                </div>
                <div style={{"display": "flex", "alignItems": "center", "gap": "10px", "flexWrap": "wrap"}}>
                  <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                    {"Compare with"}
                  </span>
                  <div style={{"display": "flex", "gap": "2px", "padding": "3px", "borderRadius": "10px", "background": "oklch(1 0 0 / 0.04)", "border": "1px solid oklch(1 0 0 / 0.07)", "flexWrap": "wrap"}}>
                    {(v.sCmpOpts || []).map((o: any, _i1: number) => (
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
              <div style={{"position": "relative", "display": "flex", "justifyContent": "space-between", "alignItems": "flex-start"}}>
                <div style={{"position": "absolute", "left": "45px", "right": "45px", "top": "9px", "height": "1px", "background": "linear-gradient(90deg, oklch(0.82 0.13 210 / 0.15), oklch(0.82 0.13 210), oklch(0.82 0.13 210 / 0.15))"}} />
                {(v.sNodes || []).map((n: any, _i1: number) => (
                  <Fragment key={_i1}>
                    <button onClick={n.pick} style={{"position": "relative", "border": "0", "background": "transparent", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "7px", "padding": "0", "width": "90px"}}>
                      <span style={{"width": "18px", "height": "18px", "borderRadius": "50%", "background": "oklch(0.145 0.016 262)", "border": n.border, "boxShadow": n.glow, "display": "flex", "alignItems": "center", "justifyContent": "center"}}>
                        <span style={{"width": "8px", "height": "8px", "borderRadius": "50%", "background": n.fill}} />
                      </span>
                      <span style={{"fontSize": "13px", "color": n.fg, "fontVariantNumeric": "tabular-nums"}}>
                        {n.label}
                      </span>
                      <span style={{"fontSize": "11px", "color": n.sc}}>
                        {n.sub}
                      </span>
                    </button>
                  </Fragment>
                ))}
              </div>
              {" "}
              <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,140px),1fr))", "gap": "12px"}}>
                {(v.sTiles || []).map((x: any, _i1: number) => (
                  <Fragment key={_i1}>
                    <button onClick={x.go} style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "cursor": x.cur, "textAlign": "left", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "padding": "16px 18px", "display": "flex", "flexDirection": "column", "gap": "6px", "minWidth": "0"}}>
                      <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                        {x.k}
                      </span>
                      <span style={{"display": "flex", "alignItems": "baseline", "gap": "5px", "flexWrap": "wrap"}}>
                        <span style={{"fontSize": "28px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.03em", "color": x.c, "fontVariantNumeric": "tabular-nums"}}>
                          {x.v}
                        </span>
                        <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                          {x.u}
                        </span>
                      </span>
                      <span style={{"fontSize": "12px", "color": x.nc}}>
                        {x.note}
                      </span>
                    </button>
                  </Fragment>
                ))}
              </div>
              {" "}
              <div style={{"display": "flex", "flexDirection": "column"}}>
                {" "}
                <div className="region-row" style={{"display": "grid", "gridTemplateColumns": "minmax(0,1fr) 90px 80px 90px 80px", "gap": "12px", "padding": "0 0 8px", "fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                  <span>
                    {"Region"}
                  </span>
                  <span style={{"textAlign": "right"}}>
                    {"Fat"}
                  </span>
                  <span style={{"textAlign": "right"}}>
                    {"Change"}
                  </span>
                  <span style={{"textAlign": "right"}}>
                    {"Lean"}
                  </span>
                  <span style={{"textAlign": "right"}}>
                    {"Change"}
                  </span>
                </div>
                {" "}
                {(v.sRegions || []).map((rg: any, _i1: number) => (
                  <Fragment key={_i1}>
                    {" "}
                    <div className="region-row" style={{"display": "grid", "gridTemplateColumns": "minmax(0,1fr) 90px 80px 90px 80px", "gap": "12px", "padding": "11px 0", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "fontSize": "13px", "fontVariantNumeric": "tabular-nums"}}>
                      {" "}
                      <span style={{"color": "oklch(0.96 0.005 250)"}}>
                        {rg.k}
                      </span>
                      <span style={{"textAlign": "right", "color": "oklch(0.96 0.005 250)"}}>
                        {rg.fat}
                      </span>
                      <span style={{"textAlign": "right", "color": rg.fc}}>
                        {rg.fd}
                      </span>
                      <span style={{"textAlign": "right", "color": "oklch(0.96 0.005 250)"}}>
                        {rg.lean}
                      </span>
                      <span style={{"textAlign": "right", "color": rg.lc}}>
                        {rg.ld}
                      </span>
                      {" "}
                    </div>
                    {" "}
                  </Fragment>
                ))}
                {" "}
              </div>
              {" "}
              {v.sIsOct ? (<>
                {" "}
                <div style={{"display": "flex", "flexDirection": "column", "gap": "12px", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "paddingTop": "18px"}}>
                  {" "}
                  <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                    {v.T.scanOnly}
                  </span>
                  {" "}
                  <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,160px),1fr))", "gap": "12px"}}>
                    {(v.sDetail || []).map((x: any, _i1: number) => (
                      <Fragment key={_i1}>
                        <button onClick={x.go} style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "cursor": x.cur, "textAlign": "left", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "padding": "16px 18px", "display": "flex", "flexDirection": "column", "gap": "6px", "minWidth": "0"}}>
                          <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                            {x.k}
                          </span>
                          <span style={{"display": "flex", "alignItems": "baseline", "gap": "5px", "flexWrap": "wrap"}}>
                            <span style={{"fontSize": "28px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.03em", "color": x.c, "fontVariantNumeric": "tabular-nums"}}>
                              {x.v}
                            </span>
                            <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                              {x.u}
                            </span>
                          </span>
                          <span style={{"fontSize": "12px", "color": x.nc}}>
                            {x.note}
                          </span>
                        </button>
                      </Fragment>
                    ))}
                  </div>
                  {" "}
                </div>
                {" "}
              </>) : null}
            </section>
          </div>
        </>) : null}
        {" "}
        {v.show.recovery ? (<>
          <div data-screen-label="recovery" style={{"display": "flex", "flexDirection": "column", "gap": "16px"}}>
            <div style={{"display": "flex", "flexWrap": "wrap", "gap": "16px", "alignItems": "stretch"}}>
              <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "24px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0", "flex": "1 1 320px"}}>
                <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                  <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                    {"Recovery & sleep"}
                  </div>
                  <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                    {v.T.woke}
                  </span>
                </div>
                {" "}
                <div style={{"display": "flex", "justifyContent": "center", "gap": "14px", "width": "100%"}}>
                  <Dial d={v.dial} />
                  <Dial d={v.sleepDial} />
                </div>
                {v.dial.synced ? <span style={{"fontSize": "11px", "color": "oklch(0.6 0.015 255)", "textAlign": "center"}}>{v.dial.synced}</span> : null}
                {" "}
                <div style={{"display": "grid", "gridTemplateColumns": "repeat(3,minmax(0,1fr))", "gap": "1px", "background": "oklch(1 0 0 / 0.07)", "borderRadius": "12px", "overflow": "hidden"}}>
                  {(v.recMini || []).map((m: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <div style={{"background": "oklch(0.185 0.018 262)", "padding": "12px 14px", "display": "flex", "flexDirection": "column", "gap": "3px"}}>
                        <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                          {m.k}
                        </span>
                        <span style={{"fontSize": "20px", "color": m.c, "fontVariantNumeric": "tabular-nums"}}>
                          {m.v}
                          <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                            {" "}{m.u}
                          </span>
                        </span>
                        <span style={{"fontSize": "11px", "color": m.nc}}>
                          {m.note}
                        </span>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </section>
              <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0", "flex": "2 1 480px"}}>
                <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                  <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                    {"Last 30 days"}
                  </div>
                  <div style={{"display": "flex", "gap": "2px", "padding": "3px", "borderRadius": "10px", "background": "oklch(1 0 0 / 0.04)", "border": "1px solid oklch(1 0 0 / 0.07)", "flexWrap": "wrap"}}>
                    {(v.rMetric || []).map((o: any, _i1: number) => (
                      <Fragment key={_i1}>
                        <button onClick={o.pick} style={{"border": "0", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "6px 12px", "borderRadius": "7px", "background": o.bg, "color": o.fg, "transition": "background .2s,color .2s"}}>
                          {o.label}
                        </button>
                      </Fragment>
                    ))}
                  </div>
                </div>
                <div style={{"display": "flex", "alignItems": "baseline", "gap": "10px", "flexWrap": "wrap"}}>
                  <span style={{"fontSize": "13px", "color": "oklch(0.96 0.005 250)"}}>
                    {v.rHead}
                  </span>
                  <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                    {v.rNote}
                  </span>
                </div>
                <div onPointerLeave={v.rLeave} style={{"display": "flex", "alignItems": "flex-end", "gap": "3px", "height": "190px", "position": "relative"}}>
                  <div style={{"position": "absolute", "left": "0", "right": "0", "bottom": v.rBase, "borderTop": "1px dashed oklch(1 0 0 / 0.18)", "pointerEvents": "none"}} />
                  {(v.rDays || []).map((b: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <div aria-label={b.t} onPointerDown={b.down} onPointerEnter={b.enter} onClick={b.tap} style={{"flex": "1", "minWidth": "0", "height": "100%", "display": "flex", "alignItems": "flex-end", "cursor": "pointer"}}>
                        <div style={{"width": "100%", "height": b.h, "borderRadius": "3px 3px 1px 1px", "background": b.c, "boxShadow": b.glow, "opacity": b.op, "transition": "height .4s, opacity .15s"}} />
                      </div>
                    </Fragment>
                  ))}
                  {v.rTip ? (
                    <div style={{"position": "absolute", "left": v.rTip.l, "bottom": v.rTip.b, "transform": v.rTip.tf, "pointerEvents": "none", "whiteSpace": "nowrap", "padding": "6px 10px", "borderRadius": "9px", "background": "oklch(0.22 0.02 262 / 0.96)", "border": "1px solid oklch(1 0 0 / 0.12)", "boxShadow": "0 8px 24px oklch(0 0 0 / 0.45)", "display": "flex", "flexDirection": "column", "gap": "1px", "zIndex": "2"}}>
                      <span style={{"fontSize": "11px", "color": "oklch(0.74 0.015 255)"}}>{v.rTip.date}</span>
                      <span style={{"fontSize": "15px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "color": v.rTip.c, "fontVariantNumeric": "tabular-nums"}}>{v.rTip.val}</span>
                    </div>
                  ) : null}
                </div>
                <div style={{"display": "flex", "justifyContent": "space-between", "fontSize": "11px", "color": "oklch(0.58 0.015 255)"}}>
                  <span>
                    {v.T.rAx[0]}
                  </span>
                  <span>
                    {v.T.rAx[1]}
                  </span>
                  <span>
                    {v.T.rAx[2]}
                  </span>
                </div>
              </section>
            </div>
            {" "}
            <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,380px),1fr))", "gap": "16px", "alignItems": "stretch"}}>
              <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
                <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                  <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                    {"Last night"}
                  </div>
                  <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                    {v.T.sleepSpan}
                  </span>
                </div>
                {" "}
                <div style={{"display": "flex", "alignItems": "baseline", "gap": "8px", "flexWrap": "wrap"}}>
                  <span style={{"fontSize": "36px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.04em", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums"}}>
                    {v.T.sleepDur}
                  </span>
                  <span style={{"fontSize": "13px", "color": "oklch(0.58 0.015 255)"}}>
                    {v.T.sleepNeed}
                  </span>
                  <span style={{"fontSize": "12px", "color": "oklch(0.78 0.15 160)", "marginLeft": "auto"}}>
                    {v.T.sleepPerf}
                  </span>
                </div>
                {" "}
                <div style={{"display": "flex", "height": "10px", "borderRadius": "5px", "overflow": "hidden", "gap": "2px"}}>
                  {(v.sleep || []).map((sl: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <div style={{"flex": sl.f, "background": sl.c}} />
                    </Fragment>
                  ))}
                </div>
                {" "}
                <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(90px,1fr))", "gap": "12px"}}>
                  {(v.sleep || []).map((sl: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <div style={{"display": "flex", "flexDirection": "column", "gap": "4px"}}>
                        <span style={{"display": "flex", "alignItems": "center", "gap": "6px", "fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                          <span style={{"width": "8px", "height": "8px", "borderRadius": "2px", "background": sl.c}} />
                          {sl.k}
                        </span>
                        <span style={{"fontSize": "20px", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums"}}>
                          {sl.v}
                        </span>
                        <span style={{"fontSize": "11px", "color": "oklch(0.58 0.015 255)"}}>
                          {sl.avg}
                        </span>
                      </div>
                    </Fragment>
                  ))}
                </div>
                {" "}
                <div style={{"display": "grid", "gridTemplateColumns": "repeat(2,minmax(0,1fr))", "gap": "1px", "background": "oklch(1 0 0 / 0.07)", "borderRadius": "12px", "overflow": "hidden"}}>
                  {(v.sleepMini || []).map((m: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <div style={{"background": "oklch(0.185 0.018 262)", "padding": "12px 14px", "display": "flex", "flexDirection": "column", "gap": "3px"}}>
                        <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                          {m.k}
                        </span>
                        <span style={{"fontSize": "20px", "color": m.c, "fontVariantNumeric": "tabular-nums"}}>
                          {m.v}
                          <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                            {" "}{m.u}
                          </span>
                        </span>
                        <span style={{"fontSize": "11px", "color": m.nc}}>
                          {m.note}
                        </span>
                      </div>
                    </Fragment>
                  ))}
                </div>
              </section>
              <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
                <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                  <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                    {"Recovery mix"}
                  </div>
                  <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                    {"Green ≥67 · yellow 34–66 · red "}
                    {"<"}
                    {"34"}
                  </span>
                </div>
                {" "}
                {(v.recMix || []).map((mx: any, _i1: number) => (
                  <Fragment key={_i1}>
                    {" "}
                    <div style={{"display": "flex", "flexDirection": "column", "gap": "8px"}}>
                      {" "}
                      <div style={{"display": "flex", "justifyContent": "space-between", "fontSize": "13px"}}>
                        <span style={{"color": "oklch(0.74 0.015 255)"}}>
                          {mx.k}
                        </span>
                        <span style={{"color": "oklch(0.58 0.015 255)", "fontVariantNumeric": "tabular-nums"}}>
                          {mx.avg}
                        </span>
                      </div>
                      {" "}
                      <div style={{"display": "flex", "height": "10px", "borderRadius": "5px", "overflow": "hidden", "gap": "2px"}}>
                        <div style={{"flex": mx.g, "background": "oklch(0.78 0.15 160)"}} />
                        <div style={{"flex": mx.y, "background": "oklch(0.82 0.14 80)"}} />
                        <div style={{"flex": mx.r, "background": "oklch(0.7 0.18 25)"}} />
                      </div>
                      {" "}
                      <div style={{"display": "flex", "gap": "14px", "fontSize": "12px", "color": "oklch(0.58 0.015 255)", "fontVariantNumeric": "tabular-nums"}}>
                        <span>
                          {mx.gt}
                        </span>
                        <span>
                          {mx.yt}
                        </span>
                        <span>
                          {mx.rt}
                        </span>
                      </div>
                      {" "}
                    </div>
                    {" "}
                  </Fragment>
                ))}
                {" "}
                <div style={{"display": "flex", "flexDirection": "column", "gap": "12px", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "paddingTop": "16px"}}>
                  {" "}
                  <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                    {"HRV by month · ms"}
                  </span>
                  {" "}
                  <div style={{"display": "flex", "alignItems": "flex-end", "gap": "6px", "height": "120px"}}>
                    {(v.hrvMonths || []).map((b: any, _i1: number) => (
                      <Fragment key={_i1}>
                        <div style={{"flex": "1", "display": "flex", "flexDirection": "column", "alignItems": "stretch", "gap": "5px", "height": "100%", "justifyContent": "flex-end", "minWidth": "0"}}>
                          <div style={{"fontSize": "10px", "color": "oklch(0.74 0.015 255)", "textAlign": "center", "fontVariantNumeric": "tabular-nums"}}>
                            {b.v}
                          </div>
                          <div style={{"height": b.h, "borderRadius": "4px 4px 1px 1px", "background": b.c, "boxShadow": b.glow}} />
                          <div style={{"fontSize": "10px", "color": "oklch(0.58 0.015 255)", "textAlign": "center"}}>
                            {b.l}
                          </div>
                        </div>
                      </Fragment>
                    ))}
                  </div>
                  {" "}
                </div>
              </section>
            </div>
            {v.rw ? (<RecoveryWork rw={v.rw} />) : null}
            <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
              <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                  {"Heart-rate zones by activity"}
                </div>
                <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                  {"Whoop · last 30 days · zones by % of max HR"}
                </span>
              </div>
              {" "}
              <div style={{"display": "flex", "flexDirection": "column"}}>
                {" "}
                <div className="zone-row zone-head" style={{"display": "grid", "gridTemplateColumns": "minmax(0,1fr) 54px 64px 54px 54px minmax(160px,2fr)", "gap": "12px", "padding": "0 0 8px", "fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                  <span>
                    {"Activity"}
                  </span>
                  <span style={{"textAlign": "right"}}>
                    {"Sessions"}
                  </span>
                  <span style={{"textAlign": "right"}}>
                    {"Time"}
                  </span>
                  <span style={{"textAlign": "right"}}>
                    {"Strain"}
                  </span>
                  <span style={{"textAlign": "right"}}>
                    {"Avg HR"}
                  </span>
                  <span>
                    {"Zone 1 → 5"}
                  </span>
                </div>
                {" "}
                {(v.zoneRows || []).map((zr: any, _i1: number) => (
                  <Fragment key={_i1}>
                    {" "}
                    <div className="zone-row" style={{"display": "grid", "gridTemplateColumns": "minmax(0,1fr) 54px 64px 54px 54px minmax(160px,2fr)", "gap": "12px", "padding": "11px 0", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "fontSize": "13px", "alignItems": "center", "fontVariantNumeric": "tabular-nums"}}>
                      {" "}
                      <span style={{"color": "oklch(0.96 0.005 250)"}}>
                        {zr.k}
                      </span>
                      <span style={{"textAlign": "right", "color": "oklch(0.74 0.015 255)"}}>
                        {zr.n}
                      </span>
                      <span style={{"textAlign": "right", "color": "oklch(0.74 0.015 255)"}}>
                        {zr.t}
                      </span>
                      <span style={{"textAlign": "right", "color": "oklch(0.96 0.005 250)"}}>
                        {zr.s}
                      </span>
                      <span style={{"textAlign": "right", "color": zr.hc}}>
                        {zr.hr}
                      </span>
                      {" "}
                      <div style={{"display": "flex", "height": "10px", "borderRadius": "5px", "overflow": "hidden", "gap": "2px", "background": "oklch(1 0 0 / 0.07)"}}>
                        {(zr.z || []).map((zz: any, _i2: number) => (
                          <Fragment key={_i2}>
                            <div title={zz.t} style={{"flex": zz.f, "background": zz.c}} />
                          </Fragment>
                        ))}
                      </div>
                      {" "}
                    </div>
                    {" "}
                  </Fragment>
                ))}
                {" "}
              </div>
              {" "}
              <div style={{"display": "flex", "gap": "14px", "flexWrap": "wrap", "fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {(v.zoneLegend || []).map((zl: any, _i1: number) => (
                  <Fragment key={_i1}>
                    <span style={{"display": "flex", "alignItems": "center", "gap": "6px"}}>
                      <span style={{"width": "8px", "height": "8px", "borderRadius": "2px", "background": zl.c}} />
                      {zl.t}
                    </span>
                  </Fragment>
                ))}
              </div>
            </section>
            <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
              <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                  {"Coach notes"}
                </div>
              </div>
              <div style={{"display": "flex", "flexDirection": "column", "gap": "12px"}}>
                {(v.recNotes || []).map((i: any, _i1: number) => (
                  <Fragment key={_i1}>
                    <div style={{"display": "flex", "gap": "12px", "alignItems": "flex-start"}}>
                      <span style={{"width": "6px", "height": "6px", "borderRadius": "50%", "marginTop": "7px", "flex": "none", "background": i.dot, "boxShadow": `0 0 8px ${i.dot}`}} />
                      <span style={{"flex": "1", "fontSize": "13px", "lineHeight": "1.55", "color": "oklch(0.96 0.005 250)", "textWrap": "pretty"}}>
                        {i.text}
                      </span>
                    </div>
                  </Fragment>
                ))}
              </div>
            </section>
          </div>
        </>) : null}
        {" "}
        {v.show.fuel ? (<FuelView v={v} />) : null}
        {v.show.journal ? (<JournalPage D={v.D} />) : null}
        {" "}
        {v.show.settings ? (<>
          <div data-screen-label="settings">
            <DataPage embedded />
          </div>
        </>) : null}
        {" "}
        {v.show.blood ? (<>
          <div data-screen-label="blood" style={{"display": "flex", "flexDirection": "column", "gap": "16px"}}>
            <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "24px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
              <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                  {"Bloodwork · Quest Diagnostics"}
                </div>
                <div style={{"display": "flex", "alignItems": "center", "gap": "10px", "flexWrap": "wrap"}}>
                  <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                    {"Compare with"}
                  </span>
                  <div style={{"display": "flex", "gap": "2px", "padding": "3px", "borderRadius": "10px", "background": "oklch(1 0 0 / 0.04)", "border": "1px solid oklch(1 0 0 / 0.07)", "flexWrap": "wrap"}}>
                    {(v.bCmpOpts || []).map((o: any, _i1: number) => (
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
              <div style={{"position": "relative", "display": "flex", "justifyContent": "space-between", "alignItems": "flex-start"}}>
                <div style={{"position": "absolute", "left": "45px", "right": "45px", "top": "9px", "height": "1px", "background": "linear-gradient(90deg, oklch(0.82 0.13 210 / 0.15), oklch(0.82 0.13 210), oklch(0.82 0.13 210 / 0.15))"}} />
                {(v.bNodes || []).map((n: any, _i1: number) => (
                  <Fragment key={_i1}>
                    <button onClick={n.pick} style={{"position": "relative", "border": "0", "background": "transparent", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "7px", "padding": "0", "width": "90px"}}>
                      <span style={{"width": "18px", "height": "18px", "borderRadius": "50%", "background": "oklch(0.145 0.016 262)", "border": n.border, "boxShadow": n.glow, "display": "flex", "alignItems": "center", "justifyContent": "center"}}>
                        <span style={{"width": "8px", "height": "8px", "borderRadius": "50%", "background": n.fill}} />
                      </span>
                      <span style={{"fontSize": "13px", "color": n.fg, "fontVariantNumeric": "tabular-nums"}}>
                        {n.label}
                      </span>
                      <span style={{"fontSize": "11px", "color": n.sc}}>
                        {n.sub}
                      </span>
                    </button>
                  </Fragment>
                ))}
              </div>
              {" "}
              <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "paddingTop": "18px"}}>
                {" "}
                <div style={{"display": "flex", "alignItems": "center", "gap": "8px", "flexWrap": "wrap"}}>
                  {" "}
                  <span style={{"fontSize": "13px", "color": "oklch(0.96 0.005 250)", "marginRight": "6px"}}>
                    {v.bSummary}
                  </span>
                  {" "}
                  {(v.bFlagged || []).map((fl: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <span style={{"display": "flex", "alignItems": "center", "gap": "6px", "padding": "5px 10px", "borderRadius": "999px", "background": "oklch(1 0 0 / 0.04)", "border": "1px solid oklch(1 0 0 / 0.07)", "fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                        <span style={{"width": "6px", "height": "6px", "borderRadius": "50%", "background": fl.c, "boxShadow": `0 0 6px ${fl.c}`}} />
                        {fl.name}{" "}
                        <span style={{"color": fl.c, "fontVariantNumeric": "tabular-nums"}}>
                          {fl.v}
                        </span>
                      </span>
                    </Fragment>
                  ))}
                  {" "}
                </div>
                {" "}
                <div style={{"display": "flex", "gap": "2px", "padding": "3px", "borderRadius": "10px", "background": "oklch(1 0 0 / 0.04)", "border": "1px solid oklch(1 0 0 / 0.07)", "flexWrap": "wrap"}}>
                  {(v.bFilterOpts || []).map((o: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <button onClick={o.pick} style={{"border": "0", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "6px 12px", "borderRadius": "7px", "background": o.bg, "color": o.fg, "transition": "background .2s,color .2s"}}>
                        {o.label}
                      </button>
                    </Fragment>
                  ))}
                </div>
                {" "}
              </div>
              {" "}
              <div style={{"display": "flex", "flexDirection": "column", "gap": "26px"}}>
                {" "}
                {(v.bPanels || []).map((p: any, _i1: number) => (
                  <Fragment key={_i1}>
                    {" "}
                    <div style={{"display": "flex", "flexDirection": "column"}}>
                      {" "}
                      <div className="lab-row lab-head" style={{"display": "grid", "gridTemplateColumns": "minmax(0,1.3fr) 88px 88px 64px 32px minmax(120px,1fr)", "gap": "14px", "padding": "0 0 8px", "fontSize": "12px", "color": "oklch(0.58 0.015 255)", "alignItems": "end"}}>
                        {" "}
                        <span style={{"color": "oklch(0.74 0.015 255)", "fontSize": "13px", "fontWeight": "500"}}>
                          {p.name}
                        </span>
                        <span style={{"textAlign": "right"}}>
                          {v.bSelLabel}
                        </span>
                        <span style={{"textAlign": "right"}}>
                          {v.bCmpLabel}
                        </span>
                        <span style={{"textAlign": "right"}}>
                          {v.bChgLabel}
                        </span>
                        <span />
                        <span>
                          {"Reference range"}
                        </span>
                        {" "}
                      </div>
                      {" "}
                      {(p.rows || []).map((r: any, _i2: number) => (
                        <Fragment key={_i2}>
                          {" "}
                          <div className="lab-row" style={{"display": "grid", "gridTemplateColumns": "minmax(0,1.3fr) 88px 88px 64px 32px minmax(120px,1fr)", "gap": "14px", "alignItems": "center", "padding": "10px 0", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "fontVariantNumeric": "tabular-nums"}}>
                            {" "}
                            <span style={{"fontSize": "13px", "color": "oklch(0.96 0.005 250)", "minWidth": "0"}}>
                              {r.name}{" "}
                              <span style={{"fontSize": "11px", "color": "oklch(0.58 0.015 255)"}}>
                                {r.u}
                              </span>
                            </span>
                            {" "}
                            <span style={{"fontSize": "14px", "textAlign": "right", "color": r.c}}>
                              {r.v}
                            </span>
                            {" "}
                            <span style={{"fontSize": "13px", "textAlign": "right", "color": r.cc}}>
                              {r.cv}
                            </span>
                            {" "}
                            <span style={{"fontSize": "12px", "textAlign": "right", "color": r.dc}}>
                              {r.d}
                            </span>
                            {" "}
                            <div style={{"display": "flex", "alignItems": "flex-end", "gap": "3px", "height": "22px", "width": "32px", "flex": "none"}}>
                              {(r.trend || []).map((tb: any, _i3: number) => (
                                <Fragment key={_i3}>
                                  <div style={{"flex": "1", "height": tb.h, "borderRadius": "2px", "background": tb.c}} />
                                </Fragment>
                              ))}
                            </div>
                            {" "}
                            <div style={{"display": "flex", "flexDirection": "column", "gap": "5px", "minWidth": "0"}}>
                              {" "}
                              <div style={{"position": "relative", "height": "4px", "borderRadius": "2px", "background": "oklch(1 0 0 / 0.07)"}}>
                                {" "}
                                <div style={{"position": "absolute", "left": "20%", "right": "20%", "top": "0", "bottom": "0", "borderRadius": "2px", "background": "oklch(0.78 0.15 160 / 0.28)"}} />
                                {" "}
                                <div style={{"position": "absolute", "top": "50%", "left": r.pc, "opacity": r.pco, "width": "9px", "height": "9px", "margin": "-4.5px 0 0 -4.5px", "borderRadius": "50%", "border": "1.5px dashed oklch(0.74 0.015 255)", "background": "oklch(0.145 0.016 262)"}} />
                                {" "}
                                <div style={{"position": "absolute", "top": "50%", "left": r.p, "opacity": r.po, "width": "9px", "height": "9px", "margin": "-4.5px 0 0 -4.5px", "borderRadius": "50%", "background": r.dot, "boxShadow": `0 0 8px ${r.dot}`}} />
                                {" "}
                              </div>
                              {" "}
                              <span style={{"fontSize": "11px", "color": "oklch(0.58 0.015 255)"}}>
                                {r.ref}
                              </span>
                              {" "}
                            </div>
                            {" "}
                          </div>
                          {" "}
                        </Fragment>
                      ))}
                      {" "}
                    </div>
                    {" "}
                  </Fragment>
                ))}
                {" "}
              </div>
            </section>
          </div>
        </>) : null}
        {" "}
        {v.show.performance ? (<>
          <div data-screen-label="performance" style={{"display": "flex", "flexDirection": "column", "gap": "16px"}}>
            <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "24px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
              <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
                <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                  {"VO₂ max test"}
                </div>
                <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                  {v.T.vo2Sub}
                </span>
              </div>
              {" "}
              <div style={{"position": "relative", "display": "flex", "justifyContent": "space-between", "alignItems": "flex-start"}}>
                <div style={{"position": "absolute", "left": "45px", "right": "45px", "top": "9px", "height": "1px", "background": "linear-gradient(90deg, oklch(0.82 0.13 210 / 0.15), oklch(0.82 0.13 210), oklch(0.82 0.13 210 / 0.15))"}} />
                {(v.vNodes || []).map((n: any, _i1: number) => (
                  <Fragment key={_i1}>
                    <button onClick={n.pick} style={{"position": "relative", "border": "0", "background": "transparent", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "7px", "padding": "0", "width": "90px"}}>
                      <span style={{"width": "18px", "height": "18px", "borderRadius": "50%", "background": "oklch(0.145 0.016 262)", "border": n.border, "boxShadow": n.glow, "display": "flex", "alignItems": "center", "justifyContent": "center"}}>
                        <span style={{"width": "8px", "height": "8px", "borderRadius": "50%", "background": n.fill}} />
                      </span>
                      <span style={{"fontSize": "13px", "color": n.fg, "fontVariantNumeric": "tabular-nums"}}>
                        {n.label}
                      </span>
                      <span style={{"fontSize": "11px", "color": n.sc}}>
                        {n.sub}
                      </span>
                    </button>
                  </Fragment>
                ))}
              </div>
              {" "}
              <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,140px),1fr))", "gap": "12px"}}>
                {(v.vTiles || []).map((x: any, _i1: number) => (
                  <Fragment key={_i1}>
                    <button onClick={x.go} style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "cursor": x.cur, "textAlign": "left", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "padding": "16px 18px", "display": "flex", "flexDirection": "column", "gap": "6px", "minWidth": "0"}}>
                      <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                        {x.k}
                      </span>
                      <span style={{"display": "flex", "alignItems": "baseline", "gap": "5px", "flexWrap": "wrap"}}>
                        <span style={{"fontSize": "28px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.03em", "color": x.c, "fontVariantNumeric": "tabular-nums"}}>
                          {x.v}
                        </span>
                        <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                          {x.u}
                        </span>
                      </span>
                      <span style={{"fontSize": "12px", "color": x.nc}}>
                        {x.note}
                      </span>
                    </button>
                  </Fragment>
                ))}
              </div>
              {" "}
              <div style={{"display": "flex", "flexWrap": "wrap", "gap": "32px", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "paddingTop": "20px"}}>
                {" "}
                <div style={{"flex": "1 1 360px", "display": "flex", "flexDirection": "column", "gap": "14px", "minWidth": "0"}}>
                  {" "}
                  <div style={{"display": "flex", "justifyContent": "space-between", "gap": "10px", "flexWrap": "wrap"}}>
                    <span style={{"fontSize": "13px", "color": "oklch(0.96 0.005 250)"}}>
                      {"Fuel mix by stage"}
                    </span>
                    <span style={{"display": "flex", "gap": "12px", "fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                      <span style={{"display": "flex", "alignItems": "center", "gap": "6px"}}>
                        <span style={{"width": "8px", "height": "8px", "borderRadius": "2px", "background": "oklch(0.82 0.13 210)"}} />
                        {"Fat"}
                      </span>
                      <span style={{"display": "flex", "alignItems": "center", "gap": "6px"}}>
                        <span style={{"width": "8px", "height": "8px", "borderRadius": "2px", "background": "oklch(1 0 0 / 0.16)"}} />
                        {"Carbs"}
                      </span>
                    </span>
                  </div>
                  {" "}
                  <div style={{"display": "flex", "alignItems": "flex-end", "gap": "10px", "height": "190px"}}>
                    {" "}
                    {(v.vStages || []).map((st: any, _i1: number) => (
                      <Fragment key={_i1}>
                        {" "}
                        <div style={{"flex": "1", "display": "flex", "flexDirection": "column", "gap": "6px", "height": "100%", "justifyContent": "flex-end", "minWidth": "0"}}>
                          {" "}
                          <div style={{"fontSize": "11px", "color": "oklch(0.74 0.015 255)", "textAlign": "center", "fontVariantNumeric": "tabular-nums"}}>
                            {st.fatPct}
                          </div>
                          {" "}
                          <div style={{"display": "flex", "flexDirection": "column", "height": st.h, "borderRadius": "5px 5px 2px 2px", "overflow": "hidden"}}>
                            <div style={{"flex": st.cho, "background": "oklch(1 0 0 / 0.16)"}} />
                            <div style={{"flex": st.fat, "background": "oklch(0.82 0.13 210)", "boxShadow": "0 0 12px oklch(0.82 0.13 210 / 0.5)"}} />
                          </div>
                          {" "}
                          <div style={{"fontSize": "11px", "color": "oklch(0.58 0.015 255)", "textAlign": "center", "fontVariantNumeric": "tabular-nums"}}>
                            {st.hr}
                          </div>
                          {" "}
                        </div>
                        {" "}
                      </Fragment>
                    ))}
                    {" "}
                  </div>
                  {" "}
                  <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                    {"Bar height is VO₂ at each stage. Label below is heart rate, above is % of energy from fat."}
                  </span>
                  {" "}
                </div>
                {" "}
                <div style={{"flex": "1 1 300px", "display": "flex", "flexDirection": "column", "gap": "12px", "minWidth": "0"}}>
                  {" "}
                  <span style={{"fontSize": "13px", "color": "oklch(0.96 0.005 250)"}}>
                    {"Heart rate zones"}
                  </span>
                  {" "}
                  {(v.zones || []).map((z: any, _i1: number) => (
                    <Fragment key={_i1}>
                      {" "}
                      <div style={{"display": "grid", "gridTemplateColumns": "28px 1fr 70px", "gap": "12px", "alignItems": "center"}}>
                        {" "}
                        <span style={{"fontSize": "12px", "color": "oklch(0.74 0.015 255)"}}>
                          {z.z}
                        </span>
                        {" "}
                        <div style={{"position": "relative", "height": "8px", "borderRadius": "4px", "background": "oklch(1 0 0 / 0.07)"}}>
                          <div style={{"position": "absolute", "top": "0", "bottom": "0", "left": z.l, "width": z.w, "borderRadius": "4px", "background": "oklch(0.82 0.13 210)", "opacity": z.o, "boxShadow": "0 0 10px oklch(0.82 0.13 210 / 0.4)"}} />
                        </div>
                        {" "}
                        <span style={{"fontSize": "13px", "textAlign": "right", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums"}}>
                          {z.hr}
                        </span>
                        {" "}
                      </div>
                      {" "}
                    </Fragment>
                  ))}
                  {" "}
                  <div style={{"display": "flex", "flexDirection": "column", "gap": "12px", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "paddingTop": "14px", "marginTop": "4px"}}>
                    {(v.vNotes || []).map((i: any, _i1: number) => (
                      <Fragment key={_i1}>
                        <div style={{"display": "flex", "gap": "12px", "alignItems": "flex-start"}}>
                          <span style={{"width": "6px", "height": "6px", "borderRadius": "50%", "marginTop": "7px", "flex": "none", "background": i.dot, "boxShadow": `0 0 8px ${i.dot}`}} />
                          <span style={{"flex": "1", "fontSize": "13px", "lineHeight": "1.55", "color": "oklch(0.96 0.005 250)", "textWrap": "pretty"}}>
                            {i.text}
                          </span>
                          {i.go ? (<>
                            <button onClick={i.go} style={{"border": "0", "background": "transparent", "cursor": "pointer", "padding": "2px 0 0", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "color": "oklch(0.82 0.13 210)", "whiteSpace": "nowrap"}}>
                              {i.page}{" →"}
                            </button>
                          </>) : null}
                        </div>
                      </Fragment>
                    ))}
                  </div>
                  {" "}
                </div>
                {" "}
              </div>
            </section>
          </div>
        </>) : null}
        {" "}
      </main>
      {" "}
      {v.chat.closed ? (<>
        {" "}
        <button onClick={v.chat.toggle} style={{"position": "fixed", "right": v.L.fabR, "bottom": v.L.fabB, "zIndex": "80", "display": "flex", "alignItems": "center", "gap": "12px", "padding": v.L.fabPad, "borderRadius": "999px", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "border": "1px solid oklch(0.82 0.13 210 / 0.45)", "background": "oklch(0.17 0.02 262 / 0.92)", "backdropFilter": "blur(14px)", "boxShadow": "0 0 0 1px oklch(1 0 0 / 0.03), 0 12px 40px -8px oklch(0.82 0.13 210 / 0.45)"}} className="dch3">
          {" "}{v.chatOrb}{" "}
          <span style={{"display": v.L.fabLbl, "flexDirection": "column", "alignItems": "flex-start", "gap": "1px"}}>
            <span style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "color": "oklch(0.96 0.005 250)"}}>
              {"Ask "}{v.coachName}
            </span>
            <span style={{"fontSize": "11px", "color": "oklch(0.58 0.015 255)"}}>
              {"About "}{v.chat.pageLabel}
            </span>
          </span>
          {" "}
        </button>
        {" "}
      </>) : null}
      {" "}
      {v.chat.open ? (<>
        {" "}
        <aside data-screen-label="coach-chat" style={{"colorScheme": "dark", "position": "fixed", "top": v.L.chatTop, "right": v.L.chatT, "bottom": v.L.chatBot, "height": v.L.chatH, "width": v.L.chatW, "zIndex": "90", "display": "flex", "flexDirection": "column", "borderRadius": v.L.chatR, "paddingTop": v.L.safeT, "paddingBottom": v.L.safeB, "animation": v.L.chatAnim, "border": "1px solid oklch(0.82 0.13 210 / 0.3)", "background": "radial-gradient(420px 220px at 100% 0%, oklch(0.82 0.13 210 / 0.12), transparent 70%), oklch(0.16 0.018 262 / 0.97)", "backdropFilter": "blur(18px)", "boxShadow": "0 30px 80px -20px oklch(0 0 0 / 0.7), 0 0 40px -10px oklch(0.82 0.13 210 / 0.3)", "overflow": "hidden"}}>
          {" "}
          <div style={{"display": "flex", "alignItems": "center", "gap": "12px", "padding": "16px 16px 14px 18px", "borderBottom": "1px solid oklch(1 0 0 / 0.07)"}}>
            {" "}{v.chatOrbSm}{" "}
            <div style={{"flex": "1", "display": "flex", "flexDirection": "column", "gap": "2px", "minWidth": "0"}}>
              <span style={{"fontSize": "15px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "color": "oklch(0.96 0.005 250)"}}>
                {v.coachName}
              </span>
              <span style={{"fontSize": "11.5px", "color": "oklch(0.58 0.015 255)"}}>
                {"Reads the page you're on plus all your data"}
              </span>
            </div>
            {" "}
            <button onClick={v.chat.reset} title="New chat" style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "6px 10px", "borderRadius": "8px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "transparent", "color": "oklch(0.74 0.015 255)"}}>
              {"New chat"}
            </button>
            {" "}
            <button onClick={v.chat.toggle} title="Close" style={{"cursor": "pointer", "width": "32px", "height": "32px", "borderRadius": "8px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "transparent", "color": "oklch(0.74 0.015 255)", "fontSize": "16px", "lineHeight": "1", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif"}}>
              {"×"}
            </button>
            {" "}
          </div>
          {" "}
          <div style={{"display": "flex", "alignItems": "center", "gap": "8px", "padding": "10px 18px", "borderBottom": "1px solid oklch(1 0 0 / 0.07)", "fontSize": "12px", "color": "oklch(0.58 0.015 255)", "flexWrap": "wrap"}}>
            <span style={{"width": "6px", "height": "6px", "borderRadius": "50%", "background": "oklch(0.82 0.13 210)", "boxShadow": "0 0 8px oklch(0.82 0.13 210)"}} />
            {"Context: "}
            <span style={{"color": "oklch(0.96 0.005 250)"}}>
              {v.chat.pageLabel}
            </span>
            {" "}
            {v.chat.hasFocus ? (<>
              <span style={{"display": "inline-flex", "alignItems": "center", "gap": "6px", "padding": "2px 4px 2px 9px", "borderRadius": "999px", "border": "1px solid oklch(0.82 0.13 210 / 0.4)", "color": "oklch(0.82 0.13 210)"}}>
                {v.chat.focus}
                <button onClick={v.chat.clearFocus} style={{"cursor": "pointer", "border": "0", "background": "transparent", "color": "oklch(0.74 0.015 255)", "fontSize": "13px", "lineHeight": "1", "padding": "0 4px", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif"}}>
                  {"×"}
                </button>
              </span>
            </>) : null}
            {" "}
            <span style={{"flex": "1"}} />
            {" "}
            <button onClick={v.chat.toggleVoice} title="Speak replies aloud" style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "11.5px", "padding": "4px 10px", "borderRadius": "999px", "border": `1px solid ${v.chat.voiceBc}`, "background": v.chat.voiceBg, "color": v.chat.voiceFg}}>
              {v.chat.voiceT}
            </button>
          </div>
          {" "}
          <div id="im-chat-scroll" style={{"flex": "1", "overflowY": "auto", "scrollbarWidth": "thin", "scrollbarColor": "oklch(1 0 0 / 0.15) transparent", "padding": "18px", "display": "flex", "flexDirection": "column", "gap": "14px"}}>
            {" "}
            {v.chat.empty ? (<>
              {" "}
              <div style={{"display": "flex", "flexDirection": "column", "gap": "14px", "paddingTop": "6px"}}>
                {" "}
                <span style={{"fontSize": "20px", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "color": "oklch(0.96 0.005 250)", "letterSpacing": "-0.02em", "lineHeight": "1.3", "textWrap": "pretty"}}>
                  {v.chat.hello}
                </span>
                {" "}
                <span style={{"fontSize": "13px", "color": "oklch(0.74 0.015 255)", "lineHeight": "1.55"}}>
                  {"Ask anything about this page. Answers use your synced data and your injury log."}
                </span>
                {" "}
                <div style={{"display": "flex", "flexDirection": "column", "gap": "8px", "marginTop": "4px"}}>
                  {" "}
                  {(v.chat.sugg || []).map((sg: any, _i1: number) => (
                    <Fragment key={_i1}>
                      <button onClick={sg.ask} style={{"textAlign": "left", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "13px", "lineHeight": "1.45", "padding": "11px 14px", "borderRadius": "12px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "oklch(1 0 0 / 0.025)", "color": "oklch(0.96 0.005 250)"}} className="dch4">
                        {sg.t}
                      </button>
                    </Fragment>
                  ))}
                  {" "}
                </div>
                {" "}
              </div>
              {" "}
            </>) : null}
            {" "}
            {(v.chat.msgs || []).map((m: any, _i1: number) => (
              <Fragment key={_i1}>
                {" "}
                <div style={{"display": "flex", "flexDirection": "column", "gap": "5px", "alignItems": m.align}}>
                  {" "}
                  <span style={{"fontSize": "11px", "color": "oklch(0.58 0.015 255)"}}>
                    {m.meta}
                  </span>
                  {" "}
                  <div style={{"maxWidth": "92%", "padding": m.pad, "borderRadius": m.rad, "background": m.bg, "border": m.bd, "fontSize": "13.5px", "lineHeight": "1.6", "color": m.fg, "whiteSpace": "pre-wrap", "textWrap": "pretty"}}>
                    {m.text}
                    {m.typing ? (<>
                      {v.caretEl}
                    </>) : null}
                  </div>
                  {" "}
                </div>
                {" "}
              </Fragment>
            ))}
            {" "}{v.chatTyping}{" "}{v.chatListen}{" "}
          </div>
          {" "}
          {v.chat.showFollow ? (<>
            {" "}
            <div style={{"display": "flex", "flexWrap": "wrap", "gap": "6px", "padding": "0 18px 10px"}}>
              {(v.chat.sugg2 || []).map((sg: any, _i1: number) => (
                <Fragment key={_i1}>
                  <button onClick={sg.ask} style={{"flex": "none", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "6px 11px", "borderRadius": "999px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "transparent", "color": "oklch(0.74 0.015 255)", "whiteSpace": "nowrap"}} className="dch5">
                    {sg.t}
                  </button>
                </Fragment>
              ))}
            </div>
            {" "}
          </>) : null}
          {" "}
          <div style={{"padding": "12px 14px 14px", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "display": "flex", "flexDirection": "column", "gap": "8px"}}>
            {" "}
            <div style={{"display": "flex", "gap": "8px", "alignItems": "flex-end", "padding": "6px 6px 6px 14px", "borderRadius": "14px", "border": "1px solid oklch(0.82 0.13 210 / 0.3)", "background": "oklch(1 0 0 / 0.03)"}}>
              {" "}
              <textarea id="im-chat-in" rows={1} value={v.chat.input} onChange={v.chat.onInput} onKeyDown={v.chat.onKey} placeholder={v.chat.ph} style={{"flex": "1", "resize": "none", "border": "0", "outline": "none", "background": "transparent", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "13.5px", "lineHeight": "1.5", "color": "oklch(0.96 0.005 250)", "padding": "6px 0", "maxHeight": "120px", "minWidth": "0"}} />
              {" "}
              <button onPointerDown={v.chat.micDown} onPointerUp={v.chat.micUp} onPointerLeave={v.chat.micUp} title={v.chat.micTitle} style={{"flex": "none", "cursor": "pointer", "width": "36px", "height": "36px", "borderRadius": "10px", "border": `1px solid ${v.chat.micBc}`, "background": v.chat.micBg, "color": v.chat.micFg, "fontSize": "15px", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "display": "flex", "alignItems": "center", "justifyContent": "center", "touchAction": "none", "userSelect": "none"}}>
                {v.micIcon}
              </button>
              {" "}
              <button onClick={v.chat.send} style={{"flex": "none", "cursor": "pointer", "width": "36px", "height": "36px", "borderRadius": "10px", "border": "0", "background": v.chat.sendBg, "color": "oklch(0.15 0.02 262)", "fontSize": "16px", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "display": "flex", "alignItems": "center", "justifyContent": "center"}}>
                {"↑"}
              </button>
              {" "}
            </div>
            {" "}
            <span style={{"fontSize": "11px", "color": "oklch(0.58 0.015 255)", "textAlign": "center"}}>
              {v.chat.foot}
            </span>
            {" "}
          </div>
          {" "}
        </aside>
        {" "}
      </>) : null}
      {" "}
      {v.askBtn.show ? (<>
        {" "}
        <button id="im-ask-btn" onClick={v.askBtn.go} onMouseEnter={v.askBtn.on} onMouseLeave={v.askBtn.off} title={"Ask " + v.coachName + " about this card"} style={{"position": "fixed", "top": v.askBtn.top, "left": v.askBtn.left, "zIndex": "70", "display": "flex", "flexDirection": "row-reverse", "alignItems": "center", "gap": "7px", "height": "28px", "maxWidth": "28px", "padding": "4px", "borderRadius": "999px", "cursor": "pointer", "overflow": "hidden", "whiteSpace": "nowrap", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "color": "oklch(0.96 0.005 250)", "border": "1px solid oklch(0.82 0.13 210 / 0.55)", "background": "oklch(0.16 0.02 262)", "boxShadow": "0 0 0 4px oklch(0.145 0.016 262), 0 4px 18px -4px oklch(0.82 0.13 210 / 0.6)", "transform": "translate(-100%,-50%)", "transition": "max-width .25s ease, padding .25s ease, gap .25s ease"}} className="dch6">
          {v.askOrb}
          <span style={{"display": "block", "overflow": "hidden", "maxWidth": v.askBtn.lw, "opacity": v.askBtn.lo, "transition": "max-width .25s ease, opacity .2s ease"}}>
            {"Ask about this"}
          </span>
        </button>
        {" "}
      </>) : null}
      {" "}
      {v.L.mob ? (<>
        {" "}
        <header style={{"position": "fixed", "top": "0", "left": "0", "right": "0", "zIndex": "75", "display": "flex", "alignItems": "center", "gap": "12px", "padding": "calc(10px + env(safe-area-inset-top)) 16px 10px", "background": "oklch(0.13 0.016 262 / 0.82)", "backdropFilter": "blur(16px) saturate(1.4)", "WebkitBackdropFilter": "blur(16px) saturate(1.4)", "borderBottom": "1px solid oklch(1 0 0 / 0.07)"}}>
          {" "}
          <div style={{"flex": "none", "position": "relative", "width": "30px", "height": "30px", "margin": "0 3px", "borderRadius": "50%", "border": "2px solid oklch(0.88 0.11 210)", "boxShadow": "0 0 10px oklch(0.82 0.13 210 / 0.7), 0 0 22px oklch(0.82 0.13 210 / 0.35), inset 0 0 8px oklch(0.82 0.13 210 / 0.55)", "display": "flex", "alignItems": "center", "justifyContent": "center", "animation": "imHalo 3.2s ease-in-out infinite"}}>
            <div style={{"width": "15px", "height": "15px", "borderRadius": "50%", "border": "1px solid oklch(0.82 0.13 210 / 0.45)", "boxShadow": "inset 0 0 5px oklch(0.82 0.13 210 / 0.4)", "animation": "imCore 3.2s ease-in-out infinite"}} />
            <div style={{"position": "absolute", "inset": "-2px", "borderRadius": "50%", "animation": "imOrbit 6s linear infinite"}}>
              <div style={{"position": "absolute", "top": "-2px", "left": "50%", "width": "5px", "height": "5px", "marginLeft": "-2.5px", "borderRadius": "50%", "background": "oklch(0.97 0.03 210)", "boxShadow": "0 0 6px oklch(0.9 0.1 210), 0 0 12px oklch(0.82 0.13 210)"}} />
            </div>
            <div style={{"position": "absolute", "inset": "-5px", "borderRadius": "50%", "border": "1px solid oklch(0.82 0.13 210 / 0.5)", "animation": "imRipple 3.2s ease-out infinite", "pointerEvents": "none"}} />
          </div>
          {" "}
          <div style={{"flex": "1", "display": "flex", "flexDirection": "column", "minWidth": "0"}}>
            <span style={{"fontSize": "15px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "color": "oklch(0.96 0.005 250)"}}>
              {v.pg.label}
            </span>
            <span style={{"fontSize": "11.5px", "color": "oklch(0.58 0.015 255)"}}>
              {v.T.mobDate}
            </span>
          </div>
          {" "}
          <button onClick={v.voiceOpen} title={"Talk to " + v.coachName} aria-label="Voice" style={{"flex": "none", "width": "40px", "height": "40px", "borderRadius": "12px", "border": "1px solid oklch(0.82 0.13 210 / 0.45)", "background": "oklch(0.82 0.13 210 / 0.08)", "boxShadow": "0 0 14px oklch(0.82 0.13 210 / 0.15)", "display": "flex", "alignItems": "center", "justifyContent": "center", "cursor": "pointer", "padding": "0"}}>
            <span style={{"width": "24px", "height": "24px", "borderRadius": "50%", "background": "radial-gradient(circle at 35% 30%, oklch(0.95 0.06 210), oklch(0.7 0.14 220) 60%, oklch(0.45 0.12 250))", "boxShadow": "0 0 10px oklch(0.82 0.13 210 / 0.6)", "display": "flex", "alignItems": "center", "justifyContent": "center", "gap": "2px"}}>
              <span style={{"width": "2px", "height": "7px", "borderRadius": "1px", "background": "oklch(0.15 0.02 262)"}} /><span style={{"width": "2px", "height": "10px", "borderRadius": "1px", "background": "oklch(0.15 0.02 262)"}} /><span style={{"width": "2px", "height": "6px", "borderRadius": "1px", "background": "oklch(0.15 0.02 262)"}} />
            </span>
          </button>
          {" "}
          <button data-sfx="1" onClick={v.snd.toggle} title={v.snd.t} style={{"flex": "none", "width": "40px", "height": "40px", "borderRadius": "12px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "transparent", "color": v.snd.fg, "display": "flex", "alignItems": "center", "justifyContent": "center", "cursor": "pointer"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{"flex": "none"}}>
              <path d={v.snd.icon} />
            </svg>
          </button>
          {" "}
          <button onClick={v.lockNow} title="Lock Halo Labs" style={{"flex": "none", "width": "40px", "height": "40px", "borderRadius": "12px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "transparent", "color": "oklch(0.74 0.015 255)", "display": "flex", "alignItems": "center", "justifyContent": "center", "cursor": "pointer"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{"flex": "none"}}>
              <path d="M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z" />
            </svg>
          </button>
          {" "}
          <button onClick={v.go.settings} title="Settings" style={{"flex": "none", "width": "40px", "height": "40px", "borderRadius": "12px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": v.setNav.bg, "color": v.setNav.fg, "display": "flex", "alignItems": "center", "justifyContent": "center", "cursor": "pointer"}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{"flex": "none"}}>
              <path d={v.setIcon} />
            </svg>
          </button>
          {" "}
        </header>
        {" "}
        <nav style={{"position": "fixed", "left": "0", "right": "0", "bottom": "0", "zIndex": "75", "display": "grid", "gridTemplateColumns": "repeat(5,minmax(0,1fr))", "padding": "6px 6px calc(6px + env(safe-area-inset-bottom))", "background": "oklch(0.13 0.016 262 / 0.86)", "backdropFilter": "blur(18px) saturate(1.4)", "WebkitBackdropFilter": "blur(18px) saturate(1.4)", "borderTop": "1px solid oklch(1 0 0 / 0.07)"}}>
          {" "}
          {(v.tabs || []).map((tb: any, _i1: number) => (
            <Fragment key={_i1}>
              {" "}
              <button onClick={tb.go} style={{"position": "relative", "border": "0", "background": "transparent", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "4px", "padding": "8px 0 6px", "minHeight": "52px", "color": tb.fg}}>
                {" "}
                <span style={{"position": "absolute", "top": "0", "width": "22px", "height": "2px", "borderRadius": "2px", "background": tb.bar, "boxShadow": tb.glow}} />
                {" "}
                <span style={{"display": "flex", "filter": tb.f}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{"flex": "none"}}>
                    <path d={tb.icon} />
                  </svg>
                </span>
                {" "}
                <span style={{"fontSize": "10.5px", "letterSpacing": "0.01em"}}>
                  {tb.label}
                </span>
                {" "}
                <span style={{"position": "absolute", "top": "5px", "left": "calc(50% + 8px)", "fontSize": "9.5px", "lineHeight": "1", "padding": "2px 5px", "borderRadius": "999px", "background": tb.bbg, "color": "oklch(0.15 0.02 262)", "display": tb.bd}}>
                  {tb.badge}
                </span>
                {" "}
              </button>
              {" "}
            </Fragment>
          ))}
          {" "}
        </nav>
        {" "}
        {v.L.more ? (<>
          {" "}
          <div onClick={v.L.closeMore} style={{"position": "fixed", "inset": "0", "zIndex": "85", "background": "oklch(0 0 0 / 0.55)", "animation": "imBack .2s ease-out"}} />
          {" "}
          <div style={{"position": "fixed", "left": "0", "right": "0", "bottom": "0", "zIndex": "86", "padding": "10px 16px calc(20px + env(safe-area-inset-bottom))", "borderRadius": "22px 22px 0 0", "borderTop": "1px solid oklch(0.82 0.13 210 / 0.3)", "background": "oklch(0.16 0.018 262)", "boxShadow": "0 -20px 60px -10px oklch(0 0 0 / 0.6)", "animation": "imSheet .32s cubic-bezier(.2,.8,.2,1)"}}>
            {" "}
            <div style={{"width": "40px", "height": "4px", "borderRadius": "2px", "background": "oklch(1 0 0 / 0.2)", "margin": "0 auto 14px"}} />
            {" "}
            <div style={{"display": "flex", "flexDirection": "column", "gap": "6px"}}>
              {" "}
              {(v.moreItems || []).map((mi: any, _i1: number) => (
                <Fragment key={_i1}>
                  {" "}
                  <button onClick={mi.go} style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "display": "flex", "flexDirection": "row", "alignItems": "center", "gap": "14px", "padding": "13px 16px", "borderRadius": "14px", "border": `1px solid ${mi.bc}`, "background": mi.bg, "color": mi.fg, "textAlign": "left"}}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{"flex": "none"}}>
                      <path d={mi.icon} />
                    </svg>
                    <span style={{"flex": "1", "fontSize": "15px"}}>
                      {mi.label}
                    </span>
                    <span style={{"fontSize": "12px", "color": mi.bcol}}>
                      {mi.badge}
                    </span>
                    <span aria-hidden style={{"fontSize": "18px", "lineHeight": "1", "color": "oklch(0.58 0.015 255)"}}>
                      {"›"}
                    </span>
                  </button>
                  {" "}
                </Fragment>
              ))}
              {" "}
            </div>
            {" "}
          </div>
          {" "}
        </>) : null}
        {" "}
      </>) : null}
      {" "}
    <VoiceView v={v} />
    </div>
    {" "}
    </>
  )
}
