// Heroe — la primera pantalla.
//
// Diseño: en vez de una tarjeta con un meme, el héroe muestra LO QUE VE el
// modelo. El esqueleto de la mano va dibujado sobre una retícula de visor, y el
// meme aparece como el resultado que sale de ahí. Es el producto hecho visible,
// no una ilustración decorativa.
//
// Sin eyebrows en versalitas ni meta unida con puntos: se eliminaron por ser
// recursos de plantilla. La jerarquía la llevan el tamaño y el espacio.
import { Icono } from './Icono'
import { EsqueletoMano } from './EsqueletoMano'
import { urlMeme } from '../vision/memes'
import { GESTOS } from '../vision/tipos'

interface Props {
  alAbrirCamara: () => void
  alAbrirGestos: () => void
}

export function Heroe({ alAbrirCamara, alAbrirGestos }: Props) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="slogan">Intelligence meets gesture.</p>
        <h1 id="hero-title">
          Haz un gesto.<br />
          Te devolvemos<br />
          un meme.
        </h1>
        <p className="lede">
          La cámara te lee la mano y el rostro aquí mismo, en el navegador. Cuando el gesto se
          sostiene, aparece su meme. El video no sale de tu dispositivo.
        </p>
        <div className="hero-actions">
          <button className="button button-primary" type="button" onClick={alAbrirCamara}>
            <Icono nombre="camera" /> Abrir cámara
          </button>
          <button className="button button-secondary" type="button" onClick={alAbrirGestos}>
            <Icono nombre="hand" /> Probar gestos
          </button>
        </div>
        <p className="hero-privacy">
          <Icono nombre="shield" /> Sin cuentas y sin servidores. Instalable y funciona sin conexión.
        </p>
      </div>

      <div className="hero-stage">
        {/* El visor: retícula + esqueleto detectado + resultado */}
        <figure className="visor-demo">
          <div className="visor-rejilla" aria-hidden="true" />
          <EsqueletoMano className="visor-esqueleto" />

          <div className="visor-resultado">
            <img src={urlMeme('like', 0)} alt={`Meme del gesto ${GESTOS.like.etiqueta}`} />
            <span className="visor-etiqueta">{GESTOS.like.emoji} {GESTOS.like.etiqueta}</span>
          </div>

          <figcaption className="visor-pie">
            <span className="visor-punto" aria-hidden="true" />
            <span>21 puntos detectados</span>
            <span className="visor-confianza">0,94 de confianza</span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}
