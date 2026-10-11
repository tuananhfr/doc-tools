import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DeckKind } from '../types/entertainment.types'
import { useDraw } from '../hooks/useDraw'
import { EntertainmentFrame } from '../components/EntertainmentFrame'
import { CardFace } from '../components/CardFace'
import { EntertainmentFailure } from '../components/EntertainmentFailure'
import { ResultProvenance } from '../components/ResultProvenance'
import { ReportActions } from '../components/ReportActions'

function DrawWorkspace({ kind }: { kind: DeckKind }) {
  const { t } = useTranslation('entertainment')
  const [spread, setSpread] = useState(3); const [reversed, setReversed] = useState(false)
  const draw = useDraw(kind)
  const complete = Boolean(draw.result && draw.revealed.length === draw.result.result.cards.length)
  const rows = draw.result ? [t(kind === 'cards' ? 'cards.title' : 'tarot.title'), t('cards.noMeaning'), ...draw.result.result.cards.map(card => `${card.position}. ${card.name?.replaceAll('_', ' ') ?? `${card.rank} ${card.suit}`} · ${t(card.orientation === 'REVERSED' ? 'cards.reversed' : 'cards.upright')}`), `${t('source.version')}: ${draw.result.rule_version}`, `${t('source.sources')}: ${draw.result.source_ids.join(', ')}`, `${t('source.request')}: ${draw.result.request_id}`, t('source.pending')] : []
  return <>
    {!draw.result ? <form className="cn-ent-form" onSubmit={event => { event.preventDefault(); void draw.draw(spread, reversed) }}><fieldset disabled={draw.busy}><legend>{t('cards.configure')}</legend><label htmlFor={`${kind}-spread`}>{t('cards.spread')}<select id={`${kind}-spread`} value={spread} onChange={event => setSpread(Number(event.target.value))}>{(kind === 'cards' ? [1, 3, 5, 7, 9] : [1, 3, 5, 7, 10]).map(number => <option key={number} value={number}>{t('cards.amount', { number })}</option>)}</select></label>
      {kind === 'tarot' ? <label className="cn-ent-check"><input type="checkbox" checked={reversed} onChange={event => setReversed(event.target.checked)} /><span>{t('cards.allowReversed')}</span></label> : null}
      <p>{t('cards.profile')}</p><p>{t('cards.noMeaning')}</p><div className="cn-ent-actions"><button type="submit" className="cn-button">{t(draw.busy ? 'cards.drawing' : draw.error ? 'actions.retry' : 'cards.draw')}</button>{draw.error ? <button type="button" className="cn-button cn-button--ghost" onClick={draw.reset}>{t('actions.restart')}</button> : null}</div></fieldset>{draw.error ? <EntertainmentFailure error={draw.error} /> : null}</form>
      : <section className="cn-ent-reading" aria-labelledby={`${kind}-result`}><h2 id={`${kind}-result`}>{t('cards.result')}</h2><p role="status">{t(draw.expired ? 'cards.expired' : complete ? 'cards.complete' : 'cards.revealHint')}</p><ul className="cn-ent-deck" data-count={draw.result.result.cards.length}>{draw.result.result.cards.map(card => <CardFace key={card.id} kind={kind} card={card} revealed={draw.revealed.includes(card.id)} expired={draw.expired} onReveal={() => draw.reveal(card.id)} />)}</ul>
      <p className="cn-ent-zoom-hint">{t('artwork.hint')}</p><div className="cn-ent-actions"><button className="cn-button" disabled={complete || draw.expired} onClick={draw.revealAll}>{t('cards.revealAll')}</button><button className="cn-button cn-button--ghost" onClick={draw.reset}>{t('actions.restart')}</button></div>
      <p className="cn-ent-no-meaning">{t('cards.noMeaning')}</p><ResultProvenance result={draw.result} /><ReportActions title={t(kind === 'cards' ? 'cards.title' : 'tarot.title')} lines={rows} disabled={!complete || draw.expired} drawKey={draw.drawKey} /></section>}
  </>
}
export default function DrawPage({ kind }: { kind: DeckKind }) { return <EntertainmentFrame><DrawWorkspace kind={kind} /></EntertainmentFrame> }
