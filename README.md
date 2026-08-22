# Settld

**Split expenses. Settle instantly.** — Aleph Hackathon 2026, track WDK.

Las apps de gastos compartidos te dicen quién te debe. Settld hace que te paguen: calcula
las deudas del grupo y las liquida con una transferencia real de USD₮ desde una wallet
self-custodial creada con el [Wallet Development Kit de Tether](https://docs.wdk.tether.io).

> Settld decide **quién le paga a quién**. WDK hace que el pago **ocurra de verdad**.

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

### Dónde se guardan los datos

Se elige solo según el entorno, en `src/lib/store/backend.ts`:

- **Local**: un JSON en `.data/split.json`. Cero setup.
- **Vercel**: Redis (Upstash), porque en serverless el filesystem es de sólo lectura.
  Se activa apenas existen `KV_REST_API_URL` y `KV_REST_API_TOKEN`, que la integración
  de Vercel inyecta sola. Habla el API REST con `fetch` pelado, sin dependencias nuevas.

Ojo: si corrés local con esas variables presentes, vas a estar escribiendo en la misma
base que producción.

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
2. Daniel toca **Cargar saldo** → **Fondos de prueba** y aparecen $50.
3. Crea el grupo **Aleph Hackathon** y suma a **@felipe**.
4. Carga el gasto **Cena, $20**, dividido entre los dos. Settld calcula **$10 cada uno**.
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
Settld UI  ─────────────────┐
   │                       │
   ▼                       ▼
lógica de Settld           WDK
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
| `src/lib/store/` | Persistencia y validación de entrada. `backend.ts` elige dónde guardar. |
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

### Cómo se carga saldo

"Cargar saldo" abre un menú con tres caminos, todos escritos para alguien que no sabe
—ni le importa— que hay una blockchain abajo:

| | Qué hace | Estado |
|---|---|---|
| **Con tarjeta** | Abre el checkout de MoonPay vía WDK. Se paga con débito o crédito y los fondos caen directo en la wallet. | Necesita clave (abajo) |
| **Que te manden** | Muestra un QR y la address para que otro te mande plata. | Funcionando |
| **Fondos de prueba** | Los $50 de la tesorería. | Funcionando |

La address aparece sólo como respaldo de quien escanea el QR, nunca como el camino
principal. En ninguna pantalla se dice "wallet", "token" ni "blockchain".

#### Activar el pago con tarjeta

El botón aparece recién cuando hay clave configurada — preferimos no mostrarlo antes que
ofrecer algo que no lleva a ningún lado. Sacá una clave publicable en
[dashboard.moonpay.com](https://dashboard.moonpay.com/signup) y agregá a `.env.local`:

```
NEXT_PUBLIC_MOONPAY_API_KEY="pk_test_..."
NEXT_PUBLIC_MOONPAY_ENVIRONMENT="sandbox"
```

En `sandbox` MoonPay simula la compra entera sin cobrar un peso, así que se puede
demostrar de punta a punta.

⚠️ **Ojo con lo que se promete en la demo:** corremos sobre Sepolia con un USD₮ *mock*,
que es un contrato de prueba y no un activo que MoonPay pueda vender. El checkout se abre
y se completa, pero los fondos no van a aparecer en el saldo. Para que la compra acredite
de verdad hay que pasar a una red real con USD₮ real. Es honesto mostrarlo como "así se
compra", no como "mirá cómo entra la plata".

### Cuenta y recuperación

La cuenta **es** la wallet. Eso plantea un problema: si la credencial fuera la frase de
12 palabras, entrar se sentiría cualquier cosa menos una app normal. Y si el servidor
guardara la clave para poder ofrecer usuario y contraseña, Settld sería custodial y podría
gastar la plata de sus usuarios.

La salida es cifrar la wallet con la contraseña, en el dispositivo:

1. Al crear la cuenta, el navegador genera la wallet y la cifra con la contraseña
   (PBKDF2 con 300.000 vueltas + AES-GCM, todo con WebCrypto, sin dependencias).
2. Al servidor le llega **sólo el bulto cifrado**. La contraseña no sale nunca del
   dispositivo, y sin ella el bulto no abre ni para nosotros.
3. Al entrar, el navegador se baja el bulto, lo abre con la contraseña y recupera la wallet.

Resultado: se entra con usuario y contraseña como en cualquier app, y las claves siguen
siendo del usuario.

**La frase de recuperación queda como plan B**, para cuando la contraseña se olvidó. Está
a un toque, tocando tu nombre en la pantalla de inicio, junto con tu address y el botón de
cerrar sesión. Al crear la cuenta no se la mostramos a nadie: eso arruinaría el momento
de entrada.

Detalles que importan:

- El vault nunca viaja junto al resto del usuario. `/api/users/lookup` y el detalle de
  grupo lo sacan de la respuesta; se entrega sólo por `/api/users/vault`, al iniciar sesión.
- AES-GCM verifica integridad, así que una contraseña equivocada o un bulto manipulado
  fallan en vez de devolver basura.
- **Límite conocido**: cualquiera puede pedir el vault de un usuario y probarle contraseñas
  offline. Las 300.000 vueltas lo hacen caro, pero contra una contraseña floja no alcanza.
  Una app de verdad necesita además rate limiting y exigir contraseñas más fuertes.

Efecto secundario útil para la demo: con esto podés mostrar el flujo de dos personas en un
solo dispositivo, cerrando sesión y entrando con la otra cuenta.

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
- [x] Cargar saldo: tarjeta (MoonPay vía WDK), QR para recibir, o fondos de prueba
- [x] Entrar con usuario y contraseña (la wallet se cifra con la contraseña, en el dispositivo)
- [x] Frase de recuperación como plan B, y cerrar sesión
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

**El almacenamiento no tiene transacciones.** Cada mutación es leer → modificar → escribir
todo el estado. Con dos o tres personas haciendo cosas de a una alcanza de sobra, pero dos
escrituras exactamente simultáneas desde instancias distintas podrían pisarse. Si el proyecto
sigue después del hackathon, esto es lo primero que hay que cambiar por una base con
transacciones de verdad.

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
