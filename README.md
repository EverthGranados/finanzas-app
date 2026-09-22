# Mis Finanzas — control de ingresos y gastos personales

Aplicación web (PWA) para llevar tus finanzas del día a día: registras tu
salario u otros ingresos, registras cada gasto, y ves cuánto te queda
disponible. Funciona sin internet y guarda todo únicamente en tu teléfono
(localStorage) — no requiere servidor ni cuenta.

Es independiente de la app **Viáticos** (`../ViaticosApp`): esa es para
gastos de viaje que te reembolsa la empresa; esta es para tu dinero personal.

## Instalar en el teléfono

Igual que Viáticos: abre `index.html` en el navegador del teléfono y usa
"Agregar a pantalla de inicio" (Android/Chrome) o "Agregar a pantalla de
inicio" desde el ícono de compartir (iPhone/Safari).

## Cómo funciona

- **Movimientos**: cada ingreso (salario, freelance, etc.) o gasto que
  registras, con categoría, concepto, monto y fecha.
- **Saldo disponible**: la suma de todos tus ingresos menos todos tus
  gastos registrados desde que empezaste a usar la app — lo que
  te queda.
- **Ingresos / Gastos del mes**: totales del mes que estás viendo (usa las
  flechas junto al nombre del mes para navegar entre meses).
- **Por categoría**: desglose de en qué se te va el dinero (o de dónde
  viene), con barra de porcentaje por categoría, para el mes seleccionado.

Toca cualquier movimiento en la lista para editarlo o eliminarlo.

## Archivos

- `index.html`, `styles.css`, `app.js` — la aplicación.
- `manifest.webmanifest`, `sw.js`, `icons/` — soporte para instalarla como
  app (PWA) y funcionar offline.
