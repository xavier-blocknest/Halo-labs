// Full-screen voice mode for the Coach, from the Claude Design prototype (v4), converted by scripts/dc-to-jsx.py.
// Bound to voiceVals() in builders.tsx (ElevenLabs listens and speaks).

const HOVER = ""

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function VoiceView({ v }: { v: any }) {
  return (
    <>
      <style>{HOVER}</style>
      {v.vOn ? (<>
        {" "}
        <div data-screen-label="voice" style={{"position": "fixed", "inset": "0", "zIndex": "95", "display": "flex", "flexDirection": "column", "alignItems": "center", "justifyContent": "space-between", "padding": "calc(24px + env(safe-area-inset-top)) 24px calc(32px + env(safe-area-inset-bottom))", "background": "radial-gradient(900px 700px at 50% 45%, oklch(0.2 0.04 230 / 0.96), oklch(0.11 0.016 262 / 0.98) 70%)", "backdropFilter": "blur(18px)", "WebkitBackdropFilter": "blur(18px)", "animation": "imVoiceIn .35s ease-out"}}>
          {" "}
          <div style={{"width": "100%", "maxWidth": "720px", "display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px"}}>
            {" "}
            <div style={{"display": "flex", "flexDirection": "column", "gap": "2px"}}>
              <span style={{"fontFamily": "'Space Grotesk',system-ui,sans-serif", "fontSize": "15px", "fontWeight": "500", "color": "oklch(0.96 0.005 250)"}}>
                {v.coachName}{" · Voice"}
              </span>
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {"Using "}{v.vPage}{" and your latest data"}
              </span>
            </div>
            {" "}
            <span style={{"fontSize": "12px", "color": v.vSt.c, "display": "flex", "alignItems": "center", "gap": "8px"}}>
              <span style={{"width": "6px", "height": "6px", "borderRadius": "50%", "background": v.vSt.c, "boxShadow": `0 0 8px ${v.vSt.c}`}} />
              {v.vSt.t}
            </span>
            {" "}
          </div>
          {" "}
          <div style={{"flex": "1", "width": "100%", "maxWidth": "720px", "display": "flex", "flexDirection": "column", "alignItems": "center", "justifyContent": "safe center", "gap": "min(28px,3vh)", "minHeight": "0", "overflowY": "auto", "scrollbarWidth": "none", "padding": "12px 0"}}>
            {" "}
            <button onClick={v.voiceTapOrb} aria-label="Tap to talk or interrupt" style={{"border": "0", "background": "transparent", "padding": "0", "cursor": "pointer", "flex": "none", "width": "min(340px,70vw,40vh)", "height": "min(340px,70vw,40vh)", "display": "flex", "alignItems": "center", "justifyContent": "center"}}>
              {v.vBlob}
            </button>
            {" "}
            <div style={{"display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "12px", "textAlign": "center", "minHeight": "min(120px,14vh)", "maxWidth": "620px"}}>
              {" "}
              <span style={{"fontSize": "14px", "color": "oklch(0.58 0.015 255)", "lineHeight": "1.5", "textWrap": "pretty"}}>
                {v.vYou}
              </span>
              {" "}
              <span style={{"fontFamily": "'Space Grotesk',system-ui,sans-serif", "fontSize": "clamp(18px,2.2vw,22px)", "fontWeight": "400", "letterSpacing": "-0.01em", "lineHeight": "1.45", "color": "oklch(0.96 0.005 250)", "textWrap": "pretty"}}>
                {v.vCoach}
              </span>
              {" "}
              {v.vErr ? (<>
                <span style={{"fontSize": "13px", "color": "oklch(0.82 0.14 80)"}}>
                  {v.vErr}
                </span>
              </>) : null}
              {" "}
            </div>
            {" "}
          </div>
          {" "}
          <div style={{"display": "flex", "flexDirection": "column", "alignItems": "center", "gap": "14px"}}>
            {" "}
            <div style={{"display": "flex", "alignItems": "center", "gap": "20px"}}>
              {" "}
              <button onClick={v.voiceMute} aria-label={v.vMuteT} style={{"cursor": "pointer", "width": "60px", "height": "60px", "borderRadius": "50%", "border": `1px solid ${v.vMuteB}`, "background": v.vMuteBg, "color": v.vMuteC, "display": "flex", "alignItems": "center", "justifyContent": "center", "transition": "all .2s"}}>
                {v.vMicIcon}
              </button>
              {" "}
              <button onClick={v.voiceClose} aria-label="End voice chat" style={{"cursor": "pointer", "width": "60px", "height": "60px", "borderRadius": "50%", "border": "1px solid oklch(0.7 0.18 25 / 0.5)", "background": "oklch(0.7 0.18 25 / 0.16)", "color": "oklch(0.85 0.1 25)", "display": "flex", "alignItems": "center", "justifyContent": "center", "fontSize": "22px", "lineHeight": "1"}}>
                {"✕"}
              </button>
              {" "}
            </div>
            {" "}
            <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
              {v.vHint}
            </span>
            {" "}
          </div>
          {" "}
        </div>
        {" "}
      </>) : null}
    </>
  )
}
