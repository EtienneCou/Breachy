import { DifficultyBadge } from '../difficulty'
import { getBestScore } from '../../utils/bestScores.js'
import { formatDuration } from '../../utils/songInfo.js'
import { useLanguage } from '../../context/LanguageContext'
import './SongCard.css'

/**
 * Carte d'un morceau, commune à l'accueil (catalogue) et à « Mes morceaux ».
 * Pochette carrée identique pour toutes les cartes, titre posé sur l'image,
 * deux boutons de même taille dessous.
 *
 * - title, subtitle       titre et artiste
 * - image                 photo de couverture (sinon un dégradé à la couleur de la difficulté)
 * - musicId               id du morceau pour le jeu et le meilleur score (null = pas de partition)
 * - info                  infos calculées (useSongsInfo) ; undefined = en cours de calcul
 * - fallbackDuration      durée affichée tant que la durée exacte n'est pas calculée
 * - isNew                 étiquette « Nouveau »
 * - onPractice, onListen  boutons « S'entraîner » et « Écouter »
 * - onDelete              bouton de suppression (morceaux ajoutés)
 */
export default function SongCard({
  title,
  subtitle,
  image,
  musicId,
  info,
  fallbackDuration,
  isNew = false,
  onPractice,
  onListen,
  onDelete,
  onResetListens,
}) {
  const { t } = useLanguage();
  // Morceau du Studio sans piste piano : il s'écoute, mais il n'y a rien à jouer.
  const noPianoPart = Boolean(info?.noPianoPart)
  const canPractice = Boolean(musicId) && info !== null && !noPianoPart
  const level = info?.difficulty?.level
  const best = canPractice ? getBestScore(musicId) : null
  const duration = info?.duration ? formatDuration(info.duration) : fallbackDuration
  const details = noPianoPart
    ? t('card.noPianoTitle')
    : !canPractice
    ? t('card.noSheetTitle')
    : info
      ? t('card.melodyNotes', info.melodyLabel, info.noteCount)
      : undefined

  return (
    <article
      className="song-tile"
      title={details}
      style={level ? { '--tile-accent': level.color, '--tile-accent-soft': level.background } : undefined}
    >
      <div className="song-tile__art">
        <div className="song-tile__cover">
          {image ? (
            <img src={image} alt="" loading="lazy" />
          ) : (
            <div className="song-tile__placeholder" aria-hidden="true">♫</div>
          )}

          <div className="song-tile__top">
            {!canPractice ? (
              <span className="song-tile__pill">{t('common.listenOnly')}</span>
            ) : level ? (
              <DifficultyBadge level={level} />
            ) : null}
            <span className="song-tile__top-right">
              {isNew && <span className="song-tile__pill song-tile__pill--new">{t('common.new')}</span>}
              {duration && <span className="song-tile__pill">{duration}</span>}
            </span>
          </div>

          <div className="song-tile__caption">
            <h3 className="song-tile__title">{title}</h3>
            <p className="song-tile__subtitle">{subtitle}</p>
            {best && (
              <p className="song-tile__best">
                <Stars count={best.stars} t={t} />
                <span className={best.successPercent === 100 ? 'is-perfect' : undefined}>{best.successPercent} %</span>
              </p>
            )}
          </div>

          {(onDelete || onResetListens) && (
            <button
              type="button"
              className="song-tile__delete"
              onClick={onResetListens ?? onDelete}
              aria-label={onResetListens ? t('card.resetListens', title) : t('card.deleteTitle', title)}
              title={onResetListens ? t('card.resetListensBtn') : t('common.delete')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="song-tile__actions">
        <button
          type="button"
          className="song-tile__btn song-tile__btn--practice"
          onClick={onPractice}
          disabled={!canPractice || !onPractice}
          title={
            canPractice
              ? t('card.practiceTitle')
              : noPianoPart
                ? t('card.noPianoTitle')
                : t('card.noSheetTitle')
          }
        >
          {t('common.practice')}
        </button>
        <button type="button" className="song-tile__btn song-tile__btn--listen" onClick={onListen} disabled={!onListen}>
          <PlayIcon />
          {t('common.listen')}
        </button>
      </div>
    </article>
  )
}

function Stars({ count, t }) {
  const ariaLabel = t ? t('card.bestScoreAria', count) : `Score : ${count}/3`
  return (
    <span className="song-tile__stars" role="img" aria-label={ariaLabel}>
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 24 24" width="13" height="13" className={i < count ? 'is-on' : ''} aria-hidden="true">
          <path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
      ))}
    </span>
  )
}

function PlayIcon() {
  return (
    <svg className="song-tile__icon" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
      <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
    </svg>
  )
}
