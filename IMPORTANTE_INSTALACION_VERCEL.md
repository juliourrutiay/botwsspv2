# Corrección de instalación en Vercel

Este proyecto NO debe subir `package-lock.json`, `pnpm-lock.yaml` ni `yarn.lock`.

Motivo: el lockfile anterior fue generado en un entorno con URLs internas de registro npm y puede provocar errores de instalación en Vercel antes de compilar.

Archivos esperados en la raíz:

- `package.json`
- `.npmrc`
- `vercel.json`

Archivos que NO deben estar en GitHub:

- `package-lock.json`
- `pnpm-lock.yaml`
- `yarn.lock`

En Vercel, usar:

- Node.js Version: `20.x`
- Root Directory: raíz del repositorio, donde está `package.json`
- Install Command: se toma desde `vercel.json`

Si Vercel sigue mostrando errores de instalación, ejecutar redeploy sin caché.
