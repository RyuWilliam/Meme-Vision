// Héroe: el mensaje, los dos botones de entrada y la vista previa con un meme.
import { Icono } from './Icono'
import { urlMeme } from '../vision/memes'

interface Props {
  alAbrirCamara: () => void
  alAbrirGestos: () => void
}

export function Heroe({ alAbrirCamara, alAbrirGestos }: Props) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="kicker"><span aria-hidden="true" /> Visión artificial en tu navegador</p>
        <p className="slogan">Intelligence meets gesture.</p>
        <h1 id="hero-title">Haz un gesto.<br />Te devolvemos un meme.</h1>
        <p className="lede">
          gestIA reconoce 14 gestos con la cámara y los convierte en memes. El video se queda en tu
          dispositivo: sin cuentas, sin servidores, sin subidas.
        </p>
        <div className="hero-actions">
          <button id="btn-abrir-camara" className="button button-primary" type="button" onClick={alAbrirCamara}>
            <Icono nombre="camera" /> Abrir cámara
          </button>
          <button className="button button-secondary" type="button" onClick={alAbrirGestos}>
            <Icono nombre="hand" /> Probar gestos
          </button>
        </div>
        <p className="hero-facts"><span>14 gestos</span><span>Modelo local</span><span>Sin cuenta</span></p>
      </div>
      <div className="hero-stage">
        <div className="viewfinder">
          <div className="viewfinder-top"><span className="rec"><i /> demo</span><span>on-device</span></div>
          <img id="hero-meme" src={urlMeme('like', 0)} alt="Meme de ejemplo: pulgar arriba" />
          <span className="corner corner-tl" aria-hidden="true" />
          <span className="corner corner-tr" aria-hidden="true" />
          <span className="corner corner-bl" aria-hidden="true" />
          <span className="corner corner-br" aria-hidden="true" />
          <div className="viewfinder-caption"><span>gesture / like</span><strong aria-hidden="true">👍</strong></div>
        </div>
        <span className="sticker sticker-like" aria-hidden="true">👍 like</span>
        <p className="hero-privacy"><Icono nombre="shield" /> Tu cámara no sale del navegador.</p>
      </div>
    </section>
  )
}
