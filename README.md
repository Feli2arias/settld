# Split

**Split expenses. Settle instantly.** — Aleph Hackathon 2026, track WDK.

Las apps de gastos compartidos te dicen quién te debe. Split hace que te paguen: calcula
las deudas del grupo y las liquida con una transferencia real de USD₮ desde una wallet
self-custodial creada con el [Wallet Development Kit de Tether](https://docs.wdk.tether.io).

> Split decide **quién le paga a quién**. WDK hace que el pago **ocurra de verdad**.

---

## Cómo correrlo

```bash
npm install --prefix split && npm run dev --prefix split
```

Abrí <http://localhost:3000>. Para demostrar con dos personas, `next dev` también sirve la
app en la IP de red local (la imprime al arrancar): abrila desde dos celulares del mismo wifi.

Hace falta un `.env.local` con la seed de la cuenta de tesorería, que es la que fondea a los
usuarios nuevos cuando tocan "Cargar saldo":

```
TREASURY_SEED_PHRASE="las doce palabras de la wallet de tesorería"
```

Opcional pero **muy recomendado para demostrar en vivo** (ver *Riesgos conocidos*):

```
NEXT_PUBLIC_BUNDLER_URL="https://api.pimlico.io/v2/11155111/rpc?apikey=TU_API_KEY"
```

Otros comandos:

```bash
npm run test --prefix split        # tests de la lógica de deudas y de plata
npm run typecheck --prefix split   # tsc
npm run build --prefix split       # build de producción
```

---

## Guion de la demo

La historia es una sola: Daniel paga una cena, Felipe queda debiendo, Felipe salda, y la
plata se mueve de verdad.

1. **Daniel** crea su cuenta. Detrás, WDK genera una seed en el dispositivo y deriva su
   wallet. Daniel nunca ve una seed phrase ni sabe que tiene una.
2. Daniel toca **Cargar saldo** y aparecen $100.
3. Crea el grupo **Aleph Hackathon** y suma a **@felipe**.
4. Carga el gasto **Cena, $20**, dividido entre los dos. Split calcula **$10 cada uno**.
5. **Felipe** abre el grupo y ve **"Debés $10.00"**.
6. Toca **Saldar mi deuda** → el preview le muestra a quién le paga, cuánto, cuánto sale
   de red y con cuánto queda. Nada salió todavía.
7. **Confirmar y pagar** → WDK transfiere 10 USD₮ de la wallet de Felipe a la de Daniel.
8. Aparece el **receipt con el hash**, linkeado a Sepolia Etherscan.
9. El grupo se actualiza: Felipe **✓ saldado**, y el saldo de Daniel sube.

Momento clave para los jueces: el paso 8. Es una transacción real, verificable en un
explorer público, disparada desde una app que nunca dijo la palabra "blockchain".

---

## Cómo está armado

```
usuario
   ↓
Split UI  ─────────────────┐
   │                       │
   ▼                       ▼
lógica de Split           WDK
usuarios, grupos          wallet self-custodial
gastos, división          address y balance
quién le debe a quién     preview del pago
net settlement            transferencia de USD₮
estado de los pagos       receipt
   │                       │
   └──────────┬────────────┘
              ▼
         blockchain
```

| Carpeta | Qué hay |
|---|---|
| `src/lib/split/` | El cerebro: balances netos y settlement mínimo. Funciones puras, con tests. |
| `src/lib/wdk/` | Todo lo que toca la blockchain: wallet, montos, receipts, config de red. |
| `src/lib/store/` | Persistencia y validación de entrada. |
| `src/lib/client/` | Sesión, seed local y cliente de la API. |
| `src/app/` | Pantallas y rutas de API. |

### La UI cambia según el dispositivo

No es la misma pantalla estirada: son dos layouts distintos que comparten los componentes.

| | mobile (<768) | tablet (768–1023) | desktop (≥1024) |
|---|---|---|---|
| Navegación | barra superior pegajosa con botón de volver | igual | barra lateral fija con los grupos siempre a la vista |
| Ancho | una columna de 28rem, pensada para el pulgar | 42rem | hasta 64rem, alineado a la izquierda junto a la barra |
| Landing | titular y botón apilados | igual | titular a la izquierda, un vistazo al producto a la derecha |
| Home | grupos en lista | grupos en dos columnas | grupos en dos columnas, sin el botón de "Nuevo grupo" porque ya está en la barra |
| Grupo | todo en una columna | igual | dos columnas: resumen y deudas a la izquierda, gastos a la derecha |
| Formularios | pantalla completa, botón abajo | igual | tarjeta centrada verticalmente |

El truco para no duplicar el markup del grupo es `display: contents`: en mobile los
contenedores de columna desaparecen y todo cae en una sola columna; a partir de `lg`
se vuelven flex y arman las dos columnas.

### Decisiones que importan

**La wallet corre en el navegador.** La seed se genera en el dispositivo y no sale de ahí.
El servidor sólo conoce la address pública, que es lo que hace falta para que otros te paguen.

**El gas se paga en USD₮.** Usamos ERC-4337 con paymaster, así que ningún usuario necesita
tener ETH. Crea la cuenta, recibe USD₮ y ya puede pagar. Sin esto, cada persona del demo
tendría que pasar por un faucet de ETH con captcha antes de poder hacer nada.

**La confirmación sale de la blockchain, no del bundler.** Ver *Riesgos conocidos*.

**Los montos son enteros.** Todo se guarda en centavos y se reparte de forma que la suma
siempre cierre: si $10 se divide entre 3, alguien paga $3.34 y no se pierde ni se inventa
un centavo.

---

## Estado

Funciona end-to-end, verificado en cadena:

- [x] Onboarding que crea la wallet con WDK
- [x] Address y balance reales
- [x] Grupos y miembros por `@usuario`
- [x] Gastos divididos en partes iguales
- [x] Cálculo de quién le debe a quién + settlement mínimo
- [x] Preview del pago con costo de red y saldo resultante
- [x] Confirmación explícita del usuario
- [x] Transferencia real de USD₮ vía WDK
- [x] Receipt con tx hash linkeado al explorer
- [x] Deuda marcada como saldada

Fuera de alcance por decisión: smart contracts, multisig, bridges, DeFi, pre-signatures,
y cualquier cosa que custodie las claves del usuario.

---

## Riesgos conocidos

**El bundler público tiene rate limit.** Pasó durante el desarrollo: la transferencia entra
bien, pero al consultar su estado el bundler devuelve *"Public API key rate limit exceeded"*.
Por eso la confirmación no le pregunta al bundler: lee el evento `UserOperationEvent` que
emite el contrato EntryPoint, directo desde el RPC (`src/lib/wdk/receipt.ts`). De ahí salen
el hash real de la transacción y si la operación tuvo éxito. Aun así, para una demo en vivo
conviene sacar una API key gratuita en [dashboard.pimlico.io](https://dashboard.pimlico.io)
y ponerla en `NEXT_PUBLIC_BUNDLER_URL`: el preview del pago sí consulta al bundler para
cotizar el fee.

**Una vez enviado, un pago nunca se reporta como fallido.** Si `transfer()` volvió, la plata
está en camino. A partir de ahí lo peor que puede pasar es que todavía no sepamos si llegó,
y eso se muestra como pendiente, nunca como error. El settlement se registra antes de
esperar la confirmación, así que queda rastro aunque el usuario cierre la app.

**La seed se guarda en localStorage sin cifrar.** Aceptable acá porque corremos sobre
Sepolia con USD₮ de prueba, que no vale nada. Para plata real hay que pedirle una
passphrase al usuario y cifrar con WebCrypto antes de tocar el disco.

**Los datos viven en un JSON local** (`.data/split.json`). Alcanza para el demo y no depende
de ningún servicio externo. Para deployar a Vercel hay que cambiar el adaptador de
`src/lib/store/db.ts` por Supabase; el resto de la app no se entera.

---

## La red

| | |
|---|---|
| Red | Ethereum Sepolia (testnet) |
| USD₮ | `0xd077a400968890eacc75cdc901f0356c943e4fdb` — 6 decimales, sin valor real |
| RPC | `ethereum-sepolia-rpc.publicnode.com` |
| Faucet de USD₮ | [dashboard.pimlico.io/test-erc20-faucet](https://dashboard.pimlico.io/test-erc20-faucet) |

Los USD₮ de esta testnet no son Tether Tokens, no se pueden canjear y no valen nada.

> El RPC que figura en los docs oficiales de WDK (`sepolia.drpc.org`) dejó de servir Sepolia
> en el plan gratuito. Si algo no conecta, empezá por ahí.
