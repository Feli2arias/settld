import type { Metadata } from 'next'
import { Landing } from '@/components/landing'

/**
 * La landing es lo único que ve alguien que todavía no usa Settld, así que es la
 * página que más importa que se renderice en el servidor: es la que se comparte,
 * la que indexan los buscadores y la que aparece en el preview de un link.
 *
 * Por eso esta página es un componente de servidor que sólo declara los metadatos
 * y monta la landing; la interactividad vive adentro.
 */
export const metadata: Metadata = {
  title: 'Settld — Split expenses. Settle instantly.',
  description:
    'Otras apps te dicen quién te debe y ahí se quedan. Settld calcula y ejecuta el pago en USD₮ directo desde tu wallet.',
  openGraph: {
    title: 'Settld — Split expenses. Settle instantly.',
    description:
      'Otras apps te dicen quién te debe y ahí se quedan. Settld calcula y ejecuta el pago en USD₮ directo desde tu wallet.',
    type: 'website'
  }
}

export default function LandingPage () {
  return <Landing />
}
