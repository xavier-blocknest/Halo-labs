// Fuel page layout from the Claude Design prototype (v4), converted by scripts/dc-to-jsx.py; every value is bound to data:
// v.pT (protoData: the nutrition protocol), v.diet (dietData: diet rules), v.fT and the rest (fuel: MacroFactor).
import { Fragment } from 'react'

const HOVER = ""

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FuelView({ v }: { v: any }) {
  return (
    <>
      <style>{HOVER}</style>
      <div data-screen-label="fuel" style={{"display": "flex", "flexDirection": "column", "gap": "16px"}}>
        {v.protoOn ? (<>
        <section style={{"position": "relative", "overflow": "hidden", "borderRadius": "22px", "border": "1px solid oklch(0.82 0.13 210 / 0.3)", "background": "radial-gradient(700px 280px at 0% 0%, oklch(0.82 0.13 210 / 0.13), transparent 70%), oklch(0.185 0.018 262 / 0.92)", "padding": "26px", "display": "flex", "flexDirection": "column", "gap": "22px"}}>
          {" "}
          <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "flex-start", "gap": "20px", "flexWrap": "wrap"}}>
            {" "}
            <div style={{"display": "flex", "flexDirection": "column", "gap": "8px", "flex": "1 1 360px", "minWidth": "0"}}>
              {" "}
              <span style={{"fontSize": "12px", "color": "oklch(0.82 0.13 210)"}}>
                {v.pT.kicker}
              </span>
              {" "}
              <span style={{"fontSize": "clamp(24px,2.6vw,32px)", "fontWeight": "400", "letterSpacing": "-0.03em", "lineHeight": "1.1", "color": "oklch(0.96 0.005 250)"}}>
                {v.pT.title}
              </span>
              {" "}
              <span style={{"fontSize": "13.5px", "lineHeight": "1.55", "color": "oklch(0.74 0.015 255)", "maxWidth": "620px", "textWrap": "pretty"}}>
                {v.pT.goal}
              </span>
              {" "}
            </div>
            {" "}
            <div style={{"display": "flex", "gap": "24px", "alignItems": "flex-end"}}>
              {" "}
              <div style={{"display": "flex", "flexDirection": "column", "gap": "2px"}}>
                <span style={{"fontSize": "48px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.05em", "lineHeight": "1", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums"}}>
                  {v.pT.days}
                </span>
                <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                  {v.pT.daysL}
                </span>
              </div>
              {" "}
              <div style={{"display": "flex", "flexDirection": "column", "gap": "2px"}}>
                <span style={{"fontSize": "26px", "fontWeight": "400", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "lineHeight": "1", "color": "oklch(0.74 0.015 255)", "fontVariantNumeric": "tabular-nums"}}>
                  {v.pT.retest}
                </span>
                <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                  {v.pT.year}
                </span>
              </div>
              {" "}
            </div>
            {" "}
          </div>
          {" "}
          <div style={{"display": "flex", "flexDirection": "column", "gap": "8px"}}>
            {" "}
            <div style={{"display": "flex", "gap": "3px"}}>
              {(v.protoWeeks || []).map((pw: any, _i1: number) => (
                <Fragment key={_i1}>
                  <div style={{"flex": "1", "display": "flex", "flexDirection": "column", "gap": "5px"}}>
                    <div style={{"height": "6px", "borderRadius": "3px", "background": pw.c, "boxShadow": pw.g}} />
                    <span style={{"fontSize": "10.5px", "color": pw.fc, "textAlign": "center"}}>
                      {pw.l}
                    </span>
                  </div>
                </Fragment>
              ))}
            </div>
            {" "}
          </div>
          {" "}
          <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,300px),1fr))", "gap": "20px", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "paddingTop": "20px"}}>
            {" "}
            <div style={{"display": "flex", "flexDirection": "column", "gap": "10px"}}>
              {" "}
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {v.pT.apobH}
              </span>
              {" "}
              <div style={{"display": "flex", "alignItems": "flex-end", "gap": "10px", "height": "110px"}}>
                {" "}
                {(v.apob || []).map((ab: any, _i1: number) => (
                  <Fragment key={_i1}>
                    <div style={{"flex": "1", "display": "flex", "flexDirection": "column", "gap": "5px", "height": "100%", "justifyContent": "flex-end"}}>
                      <span style={{"fontSize": "12px", "color": ab.vc, "textAlign": "center", "fontVariantNumeric": "tabular-nums"}}>
                        {ab.v}
                      </span>
                      <div style={{"height": ab.h, "borderRadius": "5px 5px 2px 2px", "background": ab.c, "border": ab.bd, "boxShadow": ab.g}} />
                      <span style={{"fontSize": "10.5px", "color": "oklch(0.58 0.015 255)", "textAlign": "center", "lineHeight": "1.3", "whiteSpace": "pre-line"}}>
                        {ab.l}
                      </span>
                    </div>
                  </Fragment>
                ))}
                {" "}
              </div>
              {" "}
            </div>
            {" "}
            <div style={{"display": "flex", "flexDirection": "column", "gap": "8px"}}>
              {" "}
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {v.pT.decideH}
              </span>
              {" "}
              {(v.decide || []).map((dc: any, _i1: number) => (
                <Fragment key={_i1}>
                  <div style={{"display": "grid", "gridTemplateColumns": "64px minmax(0,1fr)", "gap": "12px", "alignItems": "baseline", "padding": "8px 0", "borderTop": "1px solid oklch(1 0 0 / 0.07)"}}>
                    <span style={{"fontSize": "14px", "color": dc.c, "fontVariantNumeric": "tabular-nums"}}>
                      {dc.k}
                    </span>
                    <span style={{"fontSize": "12.5px", "color": "oklch(0.96 0.005 250)", "lineHeight": "1.45"}}>
                      {dc.v}
                    </span>
                  </div>
                </Fragment>
              ))}
              {" "}
            </div>
            {" "}
          </div>
          {" "}
        </section>
        {" "}
        <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,380px),1fr))", "gap": "16px", "alignItems": "stretch"}}>
          {" "}
          <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
            <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
              <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                {"Daily targets"}
              </div>
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {v.pT.targetsSub}
              </span>
            </div>
            {" "}
            <div style={{"display": "flex", "flexDirection": "column"}}>
              {" "}
              {(v.protoTargets || []).map((tg: any, _i1: number) => (
                <Fragment key={_i1}>
                  {" "}
                  <div style={{"display": "grid", "gridTemplateColumns": "minmax(0,1fr) 92px 100px", "gap": "12px", "alignItems": "center", "padding": "11px 0", "borderTop": "1px solid oklch(1 0 0 / 0.07)"}}>
                    {" "}
                    <span style={{"display": "flex", "flexDirection": "column", "gap": "2px"}}>
                      <span style={{"fontSize": "13.5px", "color": tg.kc, "fontWeight": tg.fw}}>
                        {tg.k}
                      </span>
                      <span style={{"fontSize": "11.5px", "color": tg.nc}}>
                        {tg.note}
                      </span>
                    </span>
                    {" "}
                    <span style={{"fontSize": "15px", "color": "oklch(0.96 0.005 250)", "textAlign": "right", "fontVariantNumeric": "tabular-nums"}}>
                      {tg.v}
                    </span>
                    {" "}
                    <span style={{"fontSize": "12px", "color": tg.bc, "textAlign": "right", "fontVariantNumeric": "tabular-nums"}}>
                      {tg.before}
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
              {v.pT.targetsNote}
            </span>
          </section>
          {" "}
          <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
            <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
              <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                {"Today"}
              </div>
              <span style={{"fontSize": "12px", "color": v.protoDayC}}>
                {v.protoDay}
              </span>
            </div>
            <div style={{"display": "flex", "flexDirection": "column"}}>
              {(v.protoPlan || []).map((pp: any, _i1: number) => (
                <Fragment key={_i1}>
                  <button onClick={pp.toggle} style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "textAlign": "left", "display": "grid", "gridTemplateColumns": "20px 64px minmax(0,1fr)", "gap": "12px", "alignItems": "start", "padding": "11px 0", "border": "0", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "background": "transparent"}}>
                    <span style={{"width": "16px", "height": "16px", "marginTop": "1px", "borderRadius": "5px", "border": `1.5px solid ${pp.bc}`, "background": pp.bg, "color": "oklch(0.18 0.03 230)", "fontSize": "11px", "lineHeight": "13px", "textAlign": "center"}}>
                      {pp.mark}
                    </span>
                    <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)", "fontVariantNumeric": "tabular-nums", "paddingTop": "1px"}}>
                      {pp.t}
                    </span>
                    <span style={{"display": "flex", "flexDirection": "column", "gap": "2px", "minWidth": "0"}}>
                      <span style={{"fontSize": "13.5px", "color": pp.fg, "textDecoration": pp.td}}>
                        {pp.k}
                      </span>
                      <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)", "lineHeight": "1.45"}}>
                        {pp.d}
                      </span>
                    </span>
                  </button>
                </Fragment>
              ))}
            </div>
          </section>
          {" "}
        </div>
        {" "}
        <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,380px),1fr))", "gap": "16px", "alignItems": "stretch"}}>
          {" "}
          <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
            <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
              <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                {"Food rules"}
              </div>
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {v.pT.labelRule}
              </span>
            </div>
            {" "}
            <div style={{"display": "flex", "flexDirection": "column"}}>
              {" "}
              <div style={{"display": "grid", "gridTemplateColumns": "72px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)", "gap": "10px", "padding": "0 0 8px", "fontSize": "11px", "color": "oklch(0.58 0.015 255)"}}>
                <span>{v.pT.ruleHead?.k}</span><span>{v.pT.ruleHead?.inn}</span><span>{v.pT.ruleHead?.out}</span><span>{v.pT.ruleHead?.lim}</span>
              </div>
              {(v.protoRules || []).map((pr3: any, _i1: number) => (
                <Fragment key={_i1}>
                  {" "}
                  <div style={{"display": "grid", "gridTemplateColumns": "72px minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)", "gap": "10px", "padding": "10px 0", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "fontSize": "12.5px", "lineHeight": "1.45"}}>
                    {" "}
                    <span style={{"color": "oklch(0.96 0.005 250)"}}>
                      {pr3.k}
                    </span>
                    <span style={{"color": "oklch(0.78 0.15 160)"}}>
                      {pr3.inn}
                    </span>
                    <span style={{"color": "oklch(0.7 0.18 25 / 0.9)"}}>
                      {pr3.out}
                    </span>
                    <span style={{"color": "oklch(0.58 0.015 255)"}}>
                      {pr3.lim}
                    </span>
                    {" "}
                  </div>
                  {" "}
                </Fragment>
              ))}
              {" "}
            </div>
          </section>
          {" "}
          <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
            <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
              <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                {"Weekly checks"}
              </div>
              <span style={{"fontSize": "12px", "color": v.wkChkC}}>
                {v.wkChkS}
              </span>
            </div>
            <div style={{"display": "flex", "flexDirection": "column"}}>
              {(v.protoWeekly || []).map((pw2: any, _i1: number) => (
                <Fragment key={_i1}>
                  <button onClick={pw2.toggle} style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "textAlign": "left", "display": "grid", "gridTemplateColumns": "20px 64px minmax(0,1fr)", "gap": "12px", "alignItems": "start", "padding": "11px 0", "border": "0", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "background": "transparent"}}>
                    <span style={{"width": "16px", "height": "16px", "marginTop": "1px", "borderRadius": "5px", "border": `1.5px solid ${pw2.bc}`, "background": pw2.bg, "color": "oklch(0.18 0.03 230)", "fontSize": "11px", "lineHeight": "13px", "textAlign": "center"}}>
                      {pw2.mark}
                    </span>
                    <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)", "fontVariantNumeric": "tabular-nums", "paddingTop": "1px"}}>
                      {pw2.t}
                    </span>
                    <span style={{"display": "flex", "flexDirection": "column", "gap": "2px", "minWidth": "0"}}>
                      <span style={{"fontSize": "13.5px", "color": pw2.fg, "textDecoration": pw2.td}}>
                        {pw2.k}
                      </span>
                      <span style={{"fontSize": "12px", "color": pw2.dc, "lineHeight": "1.45"}}>
                        {pw2.d}
                      </span>
                    </span>
                  </button>
                </Fragment>
              ))}
            </div>
            {" "}
            <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)", "lineHeight": "1.5"}}>
              {v.pT.ifThen}
            </span>
          </section>
          {" "}
        </div>
        </>) : null}
        <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,128px),1fr))", "gap": "12px"}}>
          {(v.fuelKpis || []).map((x: any, _i1: number) => (
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
        {v.dietOn ? (<>
        <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
          {" "}
          <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
            <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
              {"Discipline · diet rules"}
            </div>
            <span style={{"fontSize": "12px", "color": v.dietSumC}}>
              {v.dietSum}
            </span>
          </div>
          {" "}
          <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,210px),1fr))", "gap": "10px"}}>
            {" "}
            {(v.diet || []).map((dr: any, _i1: number) => (
              <Fragment key={_i1}>
                {" "}
                <div style={{"borderRadius": "14px", "border": `1px solid ${dr.bc}`, "background": dr.bg, "padding": "14px", "display": "flex", "flexDirection": "column", "gap": "8px", "minWidth": "0"}}>
                  {" "}
                  <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "baseline", "gap": "8px"}}>
                    <span style={{"fontSize": "14px", "color": "oklch(0.96 0.005 250)"}}>
                      {dr.name}
                    </span>
                    <span style={{"fontSize": "11px", "color": dr.c, "whiteSpace": "nowrap"}}>
                      {dr.st}
                    </span>
                  </div>
                  {" "}
                  <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                    {dr.rule}
                  </span>
                  {" "}
                  <div style={{"display": "flex", "gap": "3px"}}>
                    {" "}
                    {(dr.slots || []).map((sl: any, _i2: number) => (
                      <Fragment key={_i2}>
                        <div style={{"flex": "1", "height": "5px", "borderRadius": "3px", "background": sl.c, "boxShadow": sl.g}} />
                      </Fragment>
                    ))}
                    {" "}
                  </div>
                  {" "}
                  <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "8px"}}>
                    {" "}
                    <span style={{"fontSize": "11.5px", "color": "oklch(0.58 0.015 255)", "fontVariantNumeric": "tabular-nums"}}>
                      {dr.last}
                    </span>
                    {" "}
                    <div style={{"display": "flex", "gap": "4px"}}>
                      {" "}
                      <button onClick={dr.undo} style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "11.5px", "padding": "4px 8px", "borderRadius": "7px", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "transparent", "color": "oklch(0.58 0.015 255)", "opacity": dr.uo}}>
                        {"Undo"}
                      </button>
                      {" "}
                      <button onClick={dr.log} style={{"cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "11.5px", "padding": "4px 10px", "borderRadius": "7px", "border": `1px solid ${dr.lbc}`, "background": "transparent", "color": dr.lc}}>
                        {"Log today"}
                      </button>
                      {" "}
                    </div>
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
          <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
            {"Windows roll from each use. Locked items show when they free up. Logging over the limit is allowed but flagged."}{v.dietNote}
          </span>
          {" "}
        </section>
        </>) : null}
        {v.foodOn ? (<>
        <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,420px),1fr))", "gap": "16px", "alignItems": "start"}}>
          <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "16px", "minWidth": "0"}}>
            <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
              <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                {"What you ate"}
              </div>
              <div style={{"display": "flex", "gap": "2px", "padding": "3px", "borderRadius": "10px", "background": "oklch(1 0 0 / 0.04)", "border": "1px solid oklch(1 0 0 / 0.07)", "flexWrap": "wrap"}}>
                {(v.foodTabs || []).map((o: any, _i1: number) => (
                  <Fragment key={_i1}>
                    <button onClick={o.pick} style={{"border": "0", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "5px 10px", "borderRadius": "7px", "background": o.bg, "color": o.fg}}>
                      {o.label}
                    </button>
                  </Fragment>
                ))}
              </div>
            </div>
            <div style={{"display": "flex", "justifyContent": "space-between", "gap": "12px", "flexWrap": "wrap", "fontSize": "12.5px"}}>
              <span style={{"color": "oklch(0.74 0.015 255)"}}>{v.foodHead}</span>
              <span style={{"color": v.foodSatC, "fontVariantNumeric": "tabular-nums"}}>{v.foodSat}</span>
            </div>
            <div style={{"display": "flex", "flexDirection": "column"}}>
              <div style={{"display": "grid", "gridTemplateColumns": "64px minmax(0,1fr) 56px 64px", "gap": "10px", "padding": "0 0 8px", "fontSize": "11px", "color": "oklch(0.58 0.015 255)"}}>
                <span>{"Time"}</span><span>{"Food"}</span><span style={{"textAlign": "right"}}>{"kcal"}</span><span style={{"textAlign": "right"}}>{"Sat fat"}</span>
              </div>
              {(v.foodRows || []).map((e: any, _i1: number) => (
                <Fragment key={_i1}>
                  <div style={{"display": "grid", "gridTemplateColumns": "64px minmax(0,1fr) 56px 64px", "gap": "10px", "alignItems": "baseline", "padding": "8px 0", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "fontVariantNumeric": "tabular-nums"}}>
                    <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>{e.t}</span>
                    <span style={{"display": "flex", "flexDirection": "column", "gap": "1px", "minWidth": "0"}}>
                      <span style={{"fontSize": "13px", "color": "oklch(0.96 0.005 250)", "overflow": "hidden", "textOverflow": "ellipsis"}}>{e.name}</span>
                      <span style={{"fontSize": "11.5px", "color": "oklch(0.58 0.015 255)"}}>{e.amt}{e.amt ? " · " : ""}{e.p}{" protein"}</span>
                    </span>
                    <span style={{"fontSize": "12.5px", "color": "oklch(0.74 0.015 255)", "textAlign": "right"}}>{e.kcal}</span>
                    <span style={{"fontSize": "12.5px", "color": e.sc, "textAlign": "right"}}>{e.sat}</span>
                  </div>
                </Fragment>
              ))}
            </div>
            {v.foodPager ? (<div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px"}}>
              <button onClick={v.foodPager.prev ?? undefined} disabled={!v.foodPager.prev} aria-label="Previous foods" style={{"cursor": v.foodPager.prev ? "pointer" : "default", "opacity": v.foodPager.prevO, "width": "32px", "height": "32px", "borderRadius": "50%", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "oklch(1 0 0 / 0.04)", "color": "oklch(0.96 0.005 250)", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "14px", "display": "flex", "alignItems": "center", "justifyContent": "center"}}>{"‹"}</button>
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)", "fontVariantNumeric": "tabular-nums"}}>{v.foodPager.label}</span>
              <button onClick={v.foodPager.next ?? undefined} disabled={!v.foodPager.next} aria-label="More foods" style={{"cursor": v.foodPager.next ? "pointer" : "default", "opacity": v.foodPager.nextO, "width": "32px", "height": "32px", "borderRadius": "50%", "border": "1px solid oklch(1 0 0 / 0.07)", "background": "oklch(1 0 0 / 0.04)", "color": "oklch(0.96 0.005 250)", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "14px", "display": "flex", "alignItems": "center", "justifyContent": "center"}}>{"›"}</button>
            </div>) : null}
            {v.foodNote ? (<span style={{"fontSize": "12px", "lineHeight": "1.5", "color": "oklch(0.58 0.015 255)"}}>{v.foodNote}</span>) : null}
          </section>
          <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "16px", "minWidth": "0"}}>
            <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
              <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                {"Saturated fat sources · last 7 days"}
              </div>
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>{v.satHead}</span>
            </div>
            <div style={{"display": "flex", "flexDirection": "column", "gap": "12px"}}>
              {(v.satRows || []).map((s: any, _i1: number) => (
                <Fragment key={_i1}>
                  <div style={{"display": "flex", "flexDirection": "column", "gap": "6px"}}>
                    <div style={{"display": "flex", "justifyContent": "space-between", "gap": "12px", "alignItems": "baseline"}}>
                      <span style={{"fontSize": "13px", "color": "oklch(0.96 0.005 250)", "minWidth": "0", "overflow": "hidden", "textOverflow": "ellipsis", "whiteSpace": "nowrap"}}>{s.name}</span>
                      <span style={{"fontSize": "13px", "color": "oklch(0.96 0.005 250)", "fontVariantNumeric": "tabular-nums", "whiteSpace": "nowrap"}}>{s.v}</span>
                    </div>
                    <div style={{"height": "5px", "borderRadius": "3px", "background": "oklch(1 0 0 / 0.06)"}}>
                      <div style={{"width": s.pct, "height": "100%", "borderRadius": "3px", "background": s.c}} />
                    </div>
                    <span style={{"fontSize": "11.5px", "color": "oklch(0.58 0.015 255)"}}>{s.sub}</span>
                  </div>
                </Fragment>
              ))}
            </div>
            {v.satNote ? (<span style={{"fontSize": "12px", "lineHeight": "1.5", "color": "oklch(0.58 0.015 255)"}}>{v.satNote}</span>) : null}
          </section>
        </div>
        </>) : null}
        {v.supps ? (
        <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "14px", "minWidth": "0"}}>
          <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
            <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
              {"Supplements"}
            </div>
            <div style={{"display": "flex", "alignItems": "center", "gap": "10px"}}>
              <span style={{"fontSize": "12px", "color": v.suppSumC, "fontVariantNumeric": "tabular-nums"}}>{v.suppSum}</span>
              <button onClick={v.suppToggle} style={{"border": "1px solid oklch(1 0 0 / 0.1)", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "12px", "padding": "5px 10px", "borderRadius": "8px", "background": "oklch(1 0 0 / 0.04)", "color": "oklch(0.74 0.015 255)"}}>
                {v.suppEdit ? "Done" : "Edit"}
              </button>
            </div>
          </div>
          <div style={{"display": "flex", "flexDirection": "column"}}>
            {(v.supps || []).map((x: any, _i1: number) => (
              <Fragment key={_i1}>
                <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "padding": "9px 0", "borderTop": _i1 ? "1px solid oklch(1 0 0 / 0.07)" : "0"}}>
                  <span style={{"display": "flex", "flexDirection": "column", "gap": "1px", "minWidth": "0"}}>
                    <span style={{"fontSize": "13px", "color": "oklch(0.96 0.005 250)", "overflow": "hidden", "textOverflow": "ellipsis", "whiteSpace": "nowrap"}}>{x.name}</span>
                    {x.dose ? (<span style={{"fontSize": "11.5px", "color": "oklch(0.58 0.015 255)"}}>{x.dose}</span>) : null}
                  </span>
                  {x.edit ? (
                  <button onClick={x.del} title={"Remove " + x.name} style={{"flex": "none", "border": "0", "cursor": "pointer", "width": "28px", "height": "28px", "borderRadius": "8px", "background": "oklch(1 0 0 / 0.05)", "color": "oklch(0.74 0.015 255)", "fontSize": "15px"}}>{"×"}</button>
                  ) : (
                  <span style={{"flex": "none", "fontSize": "12px", "color": x.c, "fontVariantNumeric": "tabular-nums", "whiteSpace": "nowrap"}}>{x.s}</span>
                  )}
                </div>
              </Fragment>
            ))}
          </div>
          {v.suppEdit ? (
          <div style={{"display": "flex", "gap": "8px", "flexWrap": "wrap"}}>
            <input value={v.suppName} onChange={v.suppOnName} onKeyDown={v.suppKey} placeholder="Name, as logged in MacroFactor" style={{"flex": "2 1 200px", "minWidth": "0", "padding": "8px 10px", "borderRadius": "9px", "border": "1px solid oklch(1 0 0 / 0.1)", "background": "oklch(1 0 0 / 0.03)", "color": "oklch(0.96 0.005 250)", "fontSize": "16px", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "outline": "none"}} />
            <input value={v.suppDose} onChange={v.suppOnDose} onKeyDown={v.suppKey} placeholder="Dose" style={{"flex": "1 1 110px", "minWidth": "0", "padding": "8px 10px", "borderRadius": "9px", "border": "1px solid oklch(1 0 0 / 0.1)", "background": "oklch(1 0 0 / 0.03)", "color": "oklch(0.96 0.005 250)", "fontSize": "16px", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "outline": "none"}} />
            <button onClick={v.suppAdd} style={{"border": "0", "cursor": "pointer", "fontFamily": "'IBM Plex Sans',system-ui,sans-serif", "fontSize": "13px", "padding": "8px 14px", "borderRadius": "9px", "background": "oklch(0.82 0.13 210)", "color": "oklch(0.15 0.02 262)"}}>{"Add"}</button>
          </div>
          ) : null}
          <span style={{"fontSize": "12px", "lineHeight": "1.5", "color": "oklch(0.58 0.015 255)"}}>{v.suppNote}</span>
        </section>
        ) : null}
        <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
          <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
            <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
              {"Last 30 days"}
            </div>
            <div style={{"display": "flex", "gap": "2px", "padding": "3px", "borderRadius": "10px", "background": "oklch(1 0 0 / 0.04)", "border": "1px solid oklch(1 0 0 / 0.07)", "flexWrap": "wrap"}}>
              {(v.fMetric || []).map((o: any, _i1: number) => (
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
              {v.fMetricHead}
            </span>
            <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
              {v.fMetricNote}
            </span>
          </div>
          <div style={{"display": "flex", "alignItems": "flex-end", "gap": "3px", "height": "170px"}}>
            {(v.fDays || []).map((b: any, _i1: number) => (
              <Fragment key={_i1}>
                <div title={b.t} style={{"flex": "1", "minWidth": "0", "height": b.h, "borderRadius": "3px 3px 1px 1px", "background": b.c, "boxShadow": b.glow, "transition": "height .4s"}} />
              </Fragment>
            ))}
          </div>
          <div style={{"display": "flex", "justifyContent": "space-between", "fontSize": "11px", "color": "oklch(0.58 0.015 255)"}}>
            <span>
              {v.fT.ax[0]}
            </span>
            <span>
              {v.fT.ax[1]}
            </span>
            <span>
              {v.fT.ax[2]}
            </span>
          </div>
        </section>
        <div style={{"display": "grid", "gridTemplateColumns": "repeat(auto-fit,minmax(min(100%,380px),1fr))", "gap": "16px", "alignItems": "stretch"}}>
          <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
            <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
              <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                {v.fT.macH}
              </div>
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {v.fT.macSub}
              </span>
            </div>
            <div style={{"display": "flex", "flexDirection": "column", "gap": "18px"}}>
              {(v.macros || []).map((d: any, _i1: number) => (
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
            </div>
            {" "}
            <div style={{"display": "grid", "gridTemplateColumns": "repeat(2,minmax(0,1fr))", "gap": "1px", "background": "oklch(1 0 0 / 0.07)", "borderRadius": "12px", "overflow": "hidden"}}>
              {" "}
              {(v.fMicro || []).map((m: any, _i1: number) => (
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
                  </div>
                </Fragment>
              ))}
              {" "}
            </div>
          </section>
          <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
            <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
              <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
                {"Recent logged days"}
              </div>
            </div>
            {" "}
            <div style={{"display": "flex", "flexDirection": "column"}}>
              {" "}
              <div style={{"display": "grid", "gridTemplateColumns": "56px minmax(0,1fr) 52px 52px 52px 70px", "gap": "10px", "padding": "0 0 8px", "fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                <span>
                  {"Date"}
                </span>
                <span style={{"textAlign": "right"}}>
                  {"kcal"}
                </span>
                <span style={{"textAlign": "right"}}>
                  {"Protein"}
                </span>
                <span style={{"textAlign": "right"}}>
                  {"Carbs"}
                </span>
                <span style={{"textAlign": "right"}}>
                  {"Fat"}
                </span>
                <span style={{"textAlign": "right"}}>
                  {"Log"}
                </span>
              </div>
              {" "}
              {(v.fLogged || []).map((lg: any, _i1: number) => (
                <Fragment key={_i1}>
                  {" "}
                  <div style={{"display": "grid", "gridTemplateColumns": "56px minmax(0,1fr) 52px 52px 52px 70px", "gap": "10px", "padding": "10px 0", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "fontSize": "13px", "fontVariantNumeric": "tabular-nums"}}>
                    {" "}
                    <span style={{"color": "oklch(0.58 0.015 255)"}}>
                      {lg.d}
                    </span>
                    <span style={{"textAlign": "right", "color": "oklch(0.96 0.005 250)"}}>
                      {lg.cal}{" "}
                      <span style={{"color": "oklch(0.58 0.015 255)"}}>
                        {"/ "}{lg.tc}
                      </span>
                    </span>
                    <span style={{"textAlign": "right", "color": lg.pc}}>
                      {lg.p}
                    </span>
                    <span style={{"textAlign": "right", "color": "oklch(0.74 0.015 255)"}}>
                      {lg.c}
                    </span>
                    <span style={{"textAlign": "right", "color": "oklch(0.74 0.015 255)"}}>
                      {lg.f}
                    </span>
                    <span style={{"textAlign": "right", "color": "oklch(0.74 0.015 255)"}}>
                      {lg.win}
                    </span>
                    {" "}
                  </div>
                  {" "}
                </Fragment>
              ))}
              {" "}
            </div>
            {" "}
            {(v.fFoods || []).length ? (<>
            <div style={{"display": "flex", "flexDirection": "column", "gap": "10px", "borderTop": "1px solid oklch(1 0 0 / 0.07)", "paddingTop": "16px"}}>
              {" "}
              <span style={{"fontSize": "12px", "color": "oklch(0.58 0.015 255)"}}>
                {"Most logged foods"}
              </span>
              {" "}
              {(v.fFoods || []).map((fd: any, _i1: number) => (
                <Fragment key={_i1}>
                  <div style={{"display": "flex", "justifyContent": "space-between", "gap": "12px", "fontSize": "13px"}}>
                    <span style={{"color": "oklch(0.96 0.005 250)", "minWidth": "0", "overflow": "hidden", "textOverflow": "ellipsis", "whiteSpace": "nowrap"}}>
                      {fd.n}
                    </span>
                    <span style={{"color": "oklch(0.58 0.015 255)", "whiteSpace": "nowrap", "fontVariantNumeric": "tabular-nums"}}>
                      {fd.s}
                    </span>
                  </div>
                </Fragment>
              ))}
              {" "}
            </div>
            </>) : null}
          </section>
        </div>
        <section style={{"borderRadius": "18px", "background": "oklch(0.185 0.018 262 / 0.9)", "border": "1px solid oklch(1 0 0 / 0.07)", "boxShadow": "inset 0 1px 0 oklch(1 0 0 / 0.04)", "padding": "22px", "display": "flex", "flexDirection": "column", "gap": "18px", "minWidth": "0"}}>
          <div style={{"display": "flex", "justifyContent": "space-between", "alignItems": "center", "gap": "12px", "flexWrap": "wrap"}}>
            <div style={{"fontSize": "14px", "fontWeight": "500", "fontFamily": "'Space Grotesk',system-ui,sans-serif", "letterSpacing": "-0.005em", "color": "oklch(0.96 0.005 250)"}}>
              {"Coach notes"}
            </div>
          </div>
          <div style={{"display": "flex", "flexDirection": "column", "gap": "12px"}}>
            {(v.fuelNotes || []).map((i: any, _i1: number) => (
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
    </>
  )
}
