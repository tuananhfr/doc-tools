import type { LandingPalette } from '../utils/landing-theme'

/**
 * Inline stylesheet for the intro page. It ships inside the HTML because host sites proxy only the
 * page itself: a <link> to /_next/... would resolve against their domain and 404. Classes are
 * prefixed `cnl-` so the admin preview can render the same markup without clashing with admin CSS.
 */
export function landingCss(palette: LandingPalette, fontUrl: (file: string) => string) {
  const vars = `--cnl-bg:${palette.bg};--cnl-surface:${palette.surface};--cnl-card:${palette.card};--cnl-ink:${palette.ink};--cnl-muted:${palette.muted};--cnl-hero:${palette.hero};--cnl-line:${palette.line};--cnl-accent:${palette.accent};--cnl-accent-text:${palette.accentText};--cnl-accent-hover:${palette.accentHover};--cnl-button-text:${palette.buttonText};--cnl-tint:${palette.tint};--cnl-focus:${palette.focus};--cnl-closing:${palette.closing};--cnl-closing-text:${palette.closingText};--cnl-closing-muted:${palette.closingMuted};--cnl-shadow:${palette.shadow};--cnl-art-opacity:${palette.artOpacity}`
  return `@font-face{font-family:'CNL Be Vietnam Pro';src:url('${fontUrl('BeVietnamPro-Regular.ttf')}') format('truetype');font-weight:400;font-display:swap}
@font-face{font-family:'CNL Be Vietnam Pro';src:url('${fontUrl('BeVietnamPro-Bold.ttf')}') format('truetype');font-weight:700;font-display:swap}
.cnl{${vars};--cnl-font:'CNL Be Vietnam Pro','Segoe UI',Arial,sans-serif;--cnl-radius:12px;--cnl-radius-button:8px;margin:0;background:var(--cnl-bg);color:var(--cnl-ink);font-family:var(--cnl-font);line-height:1.65;-webkit-text-size-adjust:100%}
/* Resets sit in :where() (zero specificity) so every component rule below wins over them. */
:where(.cnl) *,:where(.cnl) *::before,:where(.cnl) *::after{box-sizing:border-box}
:where(.cnl) :where(h1,h2,h3,p,figure,ul,ol){margin:0}
:where(.cnl) :where(h1,h2,h3){font-weight:700;text-wrap:balance}
.cnl h2{font-size:clamp(28px,3.1vw,46px);line-height:1.25;letter-spacing:-.045em}
.cnl h3{font-size:21px;line-height:1.4;letter-spacing:-.025em}
:where(.cnl) img{display:block;max-width:100%}
:where(.cnl) a{color:inherit;text-underline-offset:.25em}
.cnl :is(a,button):focus-visible{outline:3px solid var(--cnl-focus);outline-offset:4px}
.cnl section[id]{scroll-margin-block-start:28px}
.cnl-icon{display:inline-flex;width:1em;height:1em;flex:none}
.cnl-icon svg{width:100%;height:100%;fill:currentColor}
.cnl-container{width:min(100% - 80px,1320px);margin-inline:auto}
.cnl-skip{position:absolute;left:-9999px;top:8px;padding:8px 14px;background:var(--cnl-surface);border-radius:var(--cnl-radius-button);z-index:10}
.cnl-skip:focus{left:8px}
.cnl-header{position:sticky;top:0;z-index:5;background:var(--cnl-surface);border-bottom:1px solid var(--cnl-line)}
.cnl-header-inner{min-height:72px;display:flex;align-items:center;gap:26px}
.cnl-brand{display:inline-flex;align-items:center;gap:10px;color:var(--cnl-ink);font-size:21px;font-weight:700;letter-spacing:-.04em;text-decoration:none;min-width:0}
.cnl-brand img{width:auto;height:40px;max-width:180px;object-fit:contain}
.cnl-nav{display:flex;align-items:center;gap:26px;margin-inline:auto}
.cnl-nav a{padding-block:12px;color:var(--cnl-ink);font-size:14px;text-decoration:none;white-space:nowrap}
.cnl-nav a:hover{color:var(--cnl-accent-text)}
.cnl-header .cnl-button{margin-inline-start:auto}
.cnl-button{display:inline-flex;justify-content:center;align-items:center;gap:14px;min-height:52px;padding:13px 25px;border:1px solid transparent;border-radius:var(--cnl-radius-button);background:var(--cnl-accent);color:var(--cnl-button-text);font:700 16px/1.45 var(--cnl-font);text-decoration:none;white-space:nowrap}
.cnl-button:hover{background:var(--cnl-accent-hover)}
.cnl-button--small{min-height:44px;padding:9px 17px;font-size:14px}
.cnl-button--inverse{background:var(--cnl-closing-text);color:var(--cnl-closing)}
.cnl-button--inverse:hover{background:var(--cnl-closing-muted)}
.cnl-link{display:inline-flex;align-items:center;gap:10px;min-height:44px;color:var(--cnl-accent-text);font-size:16px;font-weight:700}
.cnl-actions{display:flex;justify-content:center;align-items:center;gap:25px;flex-wrap:wrap}
.cnl-section{padding-block:88px}
.cnl-heading{margin-bottom:36px}
.cnl-heading p,.cnl-body{margin-top:18px;max-width:65ch;font-size:18px;color:var(--cnl-muted)}
.cnl-note{margin-top:18px;font-size:14px;color:var(--cnl-muted)}
.cnl-art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:-1;opacity:var(--cnl-art-opacity)}
.cnl-hero{position:relative;isolation:isolate;overflow:clip;padding:72px 0 88px;background:var(--cnl-hero);text-align:center}
.cnl-hero h1{max-width:1100px;margin-inline:auto;font-size:clamp(34px,4.4vw,64px);line-height:1.23;letter-spacing:-.055em}
.cnl-hero h1 span{display:block;color:var(--cnl-accent-text)}
.cnl-hero p{margin:22px auto 26px;max-width:780px;font-size:21px;color:var(--cnl-muted);text-wrap:balance}
.cnl-cases{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:28px}
.cnl-cases article{min-width:0}
.cnl-cases img{width:100%;height:auto;aspect-ratio:1;object-fit:cover;border-radius:var(--cnl-radius)}
.cnl-cases h3{margin-top:23px;font-size:25px}
.cnl-cases p{margin-top:10px;font-size:16px;color:var(--cnl-muted)}
.cnl-cases .cnl-link{margin-top:12px}
.cnl-tools{background:var(--cnl-hero)}
.cnl-tools-inner{display:grid;grid-template-columns:1.2fr 1fr;align-items:center;gap:65px}
.cnl-shot{border:6px solid var(--cnl-card);border-radius:var(--cnl-radius);overflow:hidden;box-shadow:var(--cnl-shadow);background:var(--cnl-card)}
.cnl-shot img{width:100%;height:auto;aspect-ratio:8/5;object-fit:cover}
.cnl-rows{list-style:none;margin:30px 0 22px;padding:0;display:grid;gap:25px}
.cnl-rows li{display:flex;align-items:flex-start;gap:18px}
.cnl-rows li>.cnl-icon{color:var(--cnl-accent-text);font-size:31px;margin-top:4px}
.cnl-rows h3{font-size:19px}
.cnl-rows p{margin-top:5px;font-size:15px;color:var(--cnl-muted)}
.cnl-rows a{color:var(--cnl-ink);text-decoration:none}
.cnl-rows a:hover h3{color:var(--cnl-accent-text);text-decoration:underline}
.cnl-steps{text-align:center}
.cnl-steps .cnl-heading p{margin-inline:auto}
.cnl-steps ol{padding:0;margin:45px 0 35px;list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:42px}
.cnl-steps li{position:relative}
.cnl-steps li:not(:last-child)::after{content:'';position:absolute;top:20px;inset-inline-start:calc(50% + 35px);width:calc(100% - 28px);height:1px;background:var(--cnl-line)}
.cnl-step-number{display:grid;place-items:center;width:40px;height:40px;margin-inline:auto;border-radius:50%;color:var(--cnl-button-text);background:var(--cnl-accent)}
.cnl-step-icon{display:grid;place-items:center;width:110px;height:110px;margin:25px auto;border-radius:50%;background:var(--cnl-tint);color:var(--cnl-accent-text);font-size:44px}
.cnl-steps li p{margin:12px auto 0;max-width:28ch;color:var(--cnl-muted);font-size:16px}
.cnl-privacy{position:relative;isolation:isolate;overflow:clip;background:var(--cnl-hero)}
.cnl-privacy .cnl-art{opacity:calc(var(--cnl-art-opacity) * .9)}
.cnl-privacy-copy{max-width:560px;width:49%}
.cnl-privacy .cnl-rows li{padding-bottom:20px;border-bottom:1px solid var(--cnl-line)}
.cnl-closing{position:relative;isolation:isolate;overflow:clip;min-height:650px;background:var(--cnl-closing);color:var(--cnl-closing-text)}
.cnl-closing .cnl-art{object-position:center bottom;opacity:1}
.cnl-closing-copy{position:relative;padding-block:62px 340px;text-align:center}
.cnl-closing h2{max-width:900px;margin-inline:auto;font-size:clamp(30px,3.5vw,50px)}
.cnl-closing p{margin:22px auto 26px;color:var(--cnl-closing-muted);font-size:19px}
.cnl-footer{padding:40px 0 24px;background:var(--cnl-closing);color:var(--cnl-closing-text)}
.cnl-footer-main{display:flex;align-items:center;justify-content:space-between;gap:32px;padding-bottom:28px;border-bottom:1px solid rgb(199 216 241 / 25%)}
.cnl-footer .cnl-brand{color:var(--cnl-closing-text)}
.cnl-footer p{color:var(--cnl-closing-muted);font-size:14px;margin-top:12px}
.cnl-footer nav{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:12px 24px}
.cnl-footer a{color:var(--cnl-closing-text);text-decoration:none}
.cnl-footer a:hover{text-decoration:underline}
.cnl-footer nav a{min-height:44px;display:inline-flex;align-items:center;font-size:14px}
.cnl-footer-bottom{padding-top:24px;color:var(--cnl-closing-muted);font-size:13px}
@media (max-width:1199px){.cnl-nav{display:none}.cnl-header-inner{gap:18px}}
@media (max-width:1100px){.cnl-section{padding-block:70px}.cnl-hero .cnl-art{opacity:calc(var(--cnl-art-opacity) * .45)}.cnl-privacy .cnl-art{opacity:calc(var(--cnl-art-opacity) * .25)}.cnl-tools-inner{gap:36px;grid-template-columns:1.1fr 1fr}.cnl-cases{gap:22px}.cnl-cases h3{font-size:22px}}
@media (max-width:767px){
.cnl-container{width:calc(100% - 32px)}
.cnl-header-inner{min-height:64px;gap:8px}
.cnl-brand{font-size:19px}
.cnl-brand img{height:32px;max-width:140px}
.cnl-section{padding-block:52px}
.cnl-heading{margin-bottom:28px}
.cnl-heading p,.cnl-body{font-size:16px;margin-top:14px}
.cnl-hero{padding:44px 0 56px}
.cnl-hero h1{font-size:clamp(29px,7.4vw,42px);letter-spacing:-.045em}
.cnl-hero p{font-size:17px;margin:18px auto 22px}
.cnl-hero .cnl-art{opacity:calc(var(--cnl-art-opacity) * .35);object-position:53% center}
.cnl-actions{gap:10px 20px}
.cnl-button{font-size:15px;padding-inline:21px}
.cnl-button--small{font-size:14px;padding-inline:14px}
.cnl-link{font-size:15px}
.cnl-cases{grid-template-columns:minmax(0,1fr);gap:35px}
.cnl-cases img{aspect-ratio:4/3}
.cnl-cases h3{margin-top:18px;font-size:23px}
.cnl-tools-inner{grid-template-columns:minmax(0,1fr);gap:30px}
.cnl-shot{border-width:4px}
.cnl-steps ol{grid-template-columns:minmax(0,1fr);gap:35px;margin-top:30px}
.cnl-steps li::after{display:none}
.cnl-step-icon{width:86px;height:86px;margin-block:18px;font-size:35px}
.cnl-privacy-copy{width:100%;max-width:100%}
.cnl-privacy .cnl-art{opacity:calc(var(--cnl-art-opacity) * .13);object-position:70% center}
.cnl-closing{min-height:580px}
.cnl-closing-copy{padding-block:44px 310px}
.cnl-closing p{font-size:16px}
.cnl-footer-main{display:grid;gap:24px}
.cnl-footer nav{justify-content:flex-start;gap:6px 20px}
}
@media (prefers-reduced-motion:no-preference){.cnl-button{transition:background .18s}html:has(.cnl){scroll-behavior:smooth}}`
}
