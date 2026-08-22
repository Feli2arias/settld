# Contexto de Split para generar la landing

> Copiá todo lo que sigue y pegalo en ChatGPT. Si al final le pusiste **Settld** en vez de
> Split, reemplazá el nombre antes de pegarlo — el resto sirve igual.

---

## El producto

Split es una app de gastos compartidos. Dividís la cena, el Airbnb o el viaje con tus
amigos, y cuando llega el momento de saldar, **la plata se mueve de verdad** desde la app.
Las apps tradicionales te dicen quién te debe; Split hace que te paguen.

Por debajo cada usuario tiene una wallet self-custodial y los pagos son transferencias
reales de dólares digitales, pero **el usuario nunca se entera**. No hay una sola pantalla
que diga "wallet", "token", "blockchain" ni "crypto". Se habla de saldo, cargar plata,
pagar y saldar, como cualquier app de banco.

Público: gente común de 20 a 40 años que sale a comer con amigos y se cansó de perseguir
a los que no pagan. No son técnicos y no les interesa serlo.

Frase central: **"Split expenses. Settle instantly."**
Bajada: "Las apps de gastos te dicen quién te debe. Split hace que te paguen."

## Identidad visual

La decisión de diseño más importante fue **no parecer una app de crypto**. Nada de fondo
negro con gradientes violetas ni estética futurista. En vez de eso: papel cálido, tinta
casi negra, y un verde lima de señal que aparece sólo cuando hay algo para hacer. La
referencia de tono es Wise, no un exchange.

**Colores exactos**

| Rol | Hex |
|---|---|
| Fondo, papel cálido | `#faf5eb` |
| Texto, tinta casi negra | `#141410` |
| Tarjetas, blanco roto | `#fffffc` |
| Verde lima, botones y acentos | `#b3f051` |
| Verde profundo, texto sobre el lima | `#073b0f` |
| Verde de "te deben" | `#176933` |
| Fondo suave verde | `#def6d9` |
| Rojo de "debés" | `#b7381f` |
| Gris cálido de superficies | `#eeeae0` |
| Texto secundario | `#65655c` |

**Tipografía**

- Títulos y montos: **Bricolage Grotesque**, peso 800, tracking muy cerrado (-0.045em),
  interlineado apretadísimo (0.85–0.88). Los titulares se ven densos y apilados, como un
  cartel impreso.
- Texto de interfaz: **Manrope**, peso 500–700.
- Micro-etiquetas de sección: mayúsculas, 11px, letter-spacing amplio (0.16em), gris —
  el detalle que le da aire de recibo impreso.
- Los montos siempre en cifras tabulares y enormes. **El número es el protagonista de
  cada pantalla**, no la decoración.

**Formas y textura**

- Botones tipo píldora, completamente redondeados, altos (56px), de ancho completo.
- Tarjetas con esquinas muy redondeadas (24–32px), sin sombras: sólo un borde finito
  de 1px casi transparente.
- Una textura sutil de puntitos sobre el fondo, apenas visible, que sugiere papel.
- Mucho aire. Nada apretado.

## La landing como está construida

Es mobile-first, pero en desktop cambia de layout: dos columnas.

**Izquierda:**
- Arriba, en micro-mayúsculas grises: `ALEPH HACKATHON 2026`
- Titular gigante, apilado en cuatro renglones muy juntos, en negro:
  `Split` / `expenses.` / `Settle` / `instantly.`
  — con la palabra **"Settle" en verde** (`#176933`), el resto en tinta.
- Bajada en gris: "Las apps de gastos te dicen quién te debe. Split hace que te paguen."
- Dos botones: uno lima sólido que dice **Empezar**, y al lado uno fantasma que dice
  **Ya tengo cuenta**.
- Letra chica: "Tu wallet se crea en este dispositivo y no sale de acá."

**Derecha:** un vistazo al producto, no un mockup de celular genérico. Es una tarjeta
blanca, redondeada, ligeramente rotada (-1.5°), que muestra un gasto real:

```
Cena                                   $120.00
Pagó Daniel
──────────────────────────────────────────────
● Daniel     $30.00      pagó
● Felipe     $30.00      ✓ saldado
● Sofía      $30.00      debe
● Andrés     $30.00      debe
```

Los nombres llevan avatares circulares con iniciales, cada uno de un color pastel distinto
(rosa, violeta, celeste, verde). "pagó" y "✓ saldado" en verde; "debe" en rojo.

Debajo y apenas rotada al otro lado (+1°), una píldora verde lima con texto verde oscuro:
**"Felipe pagó $30 · confirmado en la blockchain"**.

---

## El pedido para la imagen

Generá un mockup de la landing page de Split, una app de gastos compartidos entre amigos.
Estilo editorial fintech, cálido y con mucho aire — lo opuesto a una app de crypto.

Fondo color papel cálido `#faf5eb`, con una textura de puntitos casi imperceptible.
Composición de dos columnas en formato desktop 16:9.

A la izquierda: un titular tipográfico enorme y muy denso, en cuatro renglones apilados
con interlineado apretadísimo, tipo grotesca pesada estilo Bricolage Grotesque en peso 800,
que dice "Split expenses. Settle instantly." — con la palabra "Settle" en verde `#176933`
y el resto en negro cálido `#141410`. Arriba del titular, una micro-etiqueta en mayúsculas
espaciadas grises que dice "ALEPH HACKATHON 2026". Debajo, una bajada corta en gris, y dos
botones tipo píldora: uno relleno en verde lima `#b3f051` con texto verde oscuro que dice
"Empezar", y otro fantasma que dice "Ya tengo cuenta".

A la derecha: una tarjeta blanca `#fffffc` de esquinas muy redondeadas, sin sombra, apenas
rotada, mostrando un gasto compartido llamado "Cena" por "$120.00", con cuatro personas
listadas —cada una con un avatar circular pastel con su inicial y su parte de $30.00— y
etiquetas de estado en verde y rojo. Debajo, una píldora verde lima ligeramente rotada al
otro lado con el texto "Felipe pagó $30".

Sin sombras marcadas, sin gradientes, sin degradés violetas, sin estética futurista ni
elementos de crypto. Limpio, cálido, tipográfico, con mucho espacio en blanco.
