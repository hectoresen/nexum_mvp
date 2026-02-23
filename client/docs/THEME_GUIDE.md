# Nexum Theme System Guide

## Overview

Este proyecto utiliza un sistema centralizado de tema definido en `src/theme.ts` para mantener consistencia visual en toda la aplicación.

## Estructura del Tema

### Colores Principales

#### Backgrounds (Fondos)

- **`bg.main`** (#0a0a0a) - "Dark mode general black background" - Fondo principal de la aplicación
- **`bg.header`** (#111111) - "Dark mode gray detail 1" - Headers, paneles laterales
- **`bg.card`** (#1a1a1a) - Tarjetas, modales, superficies elevadas
- **`bg.input`** (#111111) - Campos de entrada
- **`bg.hover`** (#1f1f1f) - Estados hover para tarjetas/botones
- **`bg.hoverSubtle`** (rgb(31 41 55)) - Hover sutil (equivalente gray-800)

#### Borders (Bordes)

- **`border.default`** (rgb(31 41 55)) - Bordes por defecto (gray-800)
- **`border.subtle`** (rgb(55 65 81)) - Bordes sutiles (gray-700)
- **`border.input`** (rgb(31 41 55)) - Bordes de inputs
- **`border.focus`** (rgb(55 65 81)) - Estados focus

#### Text (Texto)

- **`text.primary`** (#ffffff) - Texto principal (blanco)
- **`text.secondary`** (rgb(209 213 219)) - Texto secundario (gray-300)
- **`text.tertiary`** (rgb(156 163 175)) - Texto terciario (gray-400)
- **`text.muted`** (rgb(107 114 128)) - Texto silenciado (gray-500)
- **`text.placeholder`** (rgb(107 114 128)) - Placeholders

#### Buttons (Botones)

- **`button.primary`** (#2563eb) - Botones primarios (azul)
- **`button.primaryHover`** (#3b82f6) - Hover primario
- **`button.secondary`** (rgb(31 41 55)) - Botones secundarios (gris)
- **`button.secondaryHover`** (rgb(55 65 81)) - Hover secundario
- **`button.danger`** (#dc2626) - Botones peligrosos (rojo)
- **`button.dangerHover`** (#ef4444) - Hover peligroso

#### Status (Estados)

- **`status.online`** (#22c55e) - Estado online (verde)
- **`status.offline`** (#6b7280) - Estado offline (gris)
- **`status.error`** (#ef4444) - Errores (rojo)
- **`status.success`** (#22c55e) - Éxito (verde)
- **`status.warning`** (#f59e0b) - Advertencias (ámbar)

## Cómo Usar

### Opción 1: Objetos de Estilo Inline

Para casos que requieren estilos dinámicos o inline:

```tsx
import { theme } from '../theme'

;<div style={{ backgroundColor: theme.bg.main }}>
  <button style={{ backgroundColor: theme.button.primary }}>Click me</button>
</div>
```

### Opción 2: Clases de Tailwind Pre-configuradas (Recomendado)

Para uso con Tailwind CSS:

```tsx
import { tw } from '../theme'

;<div className={`${tw.bgMain} p-4`}>
  <div className={`${tw.bgCard} ${tw.borderDefault} border rounded-lg p-6`}>
    <h2 className={tw.textPrimary}>Title</h2>
    <p className={tw.textSecondary}>Description</p>
    <button className={`${tw.btnPrimary} ${tw.textPrimary} px-4 py-2 rounded`}>Submit</button>
  </div>
</div>
```

## Mapeo de Clases Tailwind

### Backgrounds

- `tw.bgMain` → `bg-[#0a0a0a]`
- `tw.bgHeader` → `bg-[#111111]`
- `tw.bgCard` → `bg-[#1a1a1a]`
- `tw.bgInput` → `bg-[#111111]`
- `tw.bgHover` → `hover:bg-[#1f1f1f]`
- `tw.bgHoverSubtle` → `hover:bg-gray-800`

### Borders

- `tw.borderDefault` → `border-gray-800`
- `tw.borderSubtle` → `border-gray-700`

### Text

- `tw.textPrimary` → `text-white`
- `tw.textSecondary` → `text-gray-300`
- `tw.textTertiary` → `text-gray-400`
- `tw.textMuted` → `text-gray-500`

### Buttons

- `tw.btnPrimary` → `bg-blue-600 hover:bg-blue-500`
- `tw.btnSecondary` → `bg-gray-800 hover:bg-gray-700`
- `tw.btnDanger` → `bg-red-600 hover:bg-red-500`

## Ejemplos de Componentes

### Modal

```tsx
<div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: theme.overlay }}>
  <div className={`${tw.bgCard} rounded-lg shadow-xl w-full max-w-md border ${tw.borderDefault}`}>
    <div className={`flex items-center justify-between p-6 border-b ${tw.borderDefault}`}>
      <h2 className={`text-xl font-semibold ${tw.textPrimary}`}>Modal Title</h2>
      <button className={`${tw.textTertiary} hover:${tw.textPrimary}`}>×</button>
    </div>
    <div className="p-6">
      <p className={tw.textSecondary}>Modal content</p>
    </div>
  </div>
</div>
```

### Input

```tsx
<input
  type="text"
  className={`w-full px-4 py-3 ${tw.bgInput} border ${tw.borderDefault} rounded-md ${tw.textPrimary} focus:outline-none focus:ring-2`}
  style={{ '--tw-ring-color': theme.border.focus } as React.CSSProperties}
  placeholder="Enter text"
/>
```

### Button Group

```tsx
<div className="flex gap-3">
  <button className={`px-6 py-2 ${tw.btnPrimary} ${tw.textPrimary} rounded-md transition-colors`}>Save</button>
  <button className={`px-6 py-2 ${tw.btnSecondary} ${tw.textSecondary} rounded-md transition-colors`}>Cancel</button>
</div>
```

## Beneficios del Sistema

1. **Consistencia**: Todos los componentes usan los mismos colores
2. **Mantenibilidad**: Cambiar un color en `theme.ts` lo propaga por toda la app
3. **Facilidad para Light Mode**: Solo necesitas definir un nuevo tema con colores claros
4. **Centralizado**: Un único punto de verdad para todos los colores

## Migrando Componentes Antiguos

Si encuentras componentes con colores hardcodeados como:

- `bg-gray-800` → Usa `tw.bgHeader` o `tw.bgInput`
- `bg-gray-900` → Usa `tw.bgMain`
- `text-gray-400` → Usa `tw.textTertiary`
- `border-gray-700` → Usa `tw.borderSubtle`

## Implementando Light Mode (Futuro)

Para agregar light mode, crea un nuevo objeto de tema:

```typescript
export const lightTheme = {
  bg: {
    main: '#ffffff',
    header: '#f9fafb',
    card: '#ffffff',
    // ...
  },
  // ...
}
```

Luego usa un hook o contexto para alternar entre `theme` y `lightTheme`.
