# Flujo de ramas y protección de `main`

## Regla del proyecto

- `main` es la rama estable y **no recibe pushes directos**.
- Todo cambio entra por una rama (`feat/...`, `fix/...`, `docs/...`) y un Pull
  Request.
- El PR necesita **1 aprobación** de otra persona y los checks de CI en verde.

## Antes de activar la protección

1. Agrega al revisor como colaborador:
   `Settings → Collaborators → Add people`.
2. Dale permiso **Write** (GitHub solo cuenta approvals de personas con write o
   admin).
3. Que acepte la invitación.

> No puedes aprobar tu propio PR. Si el revisor no tiene acceso Write, el PR
> quedará bloqueado por el approval.

## Checks de CI

El workflow `.github/workflows/ci.yml` publica dos checks:

| Check | Qué ejecuta |
| --- | --- |
| `frontend` | `npm ci`, `npm test`, `npm run build` |
| `python` | `pip install -r requirements.txt`, `pytest -q` en `nucleo` |

Los checks aparecen en el selector de branch protection **después del primer
PR** que los ejecute.

## Configurar la protección (UI)

1. Ir a `Settings → Branches → Add branch protection rule`.
2. Branch name pattern: `main`.
3. Activar:
   - [x] **Require a pull request before merging**
     - Required approvals: **1**
     - [x] Dismiss stale approvals when new commits are pushed
   - [x] **Require status checks to pass before merging**
     - Seleccionar `frontend` y `python`
     - [x] Require branches to be up to date before merging
   - [x] **Do not allow bypassing the above settings**
   - [x] **Block force pushes**
   - [x] **Block deletions**
4. Guardar.
5. Opcional: activar **Require conversation resolution before merging**.

Si el repo usa Rulesets en vez de Branch protection, crea un ruleset que
apunte a `main` con las mismas reglas.

## Flujo diario

```powershell
# 1. Crear rama desde main actualizado
git checkout main
git pull
git checkout -b feat/mi-cambio

# 2. Trabajar y commitear con la skill git-commit
# ...

# 3. Subir la rama
git push -u origin feat/mi-cambio

# 4. Abrir el PR en GitHub y esperar CI + approval
```

## Probar que `main` está protegido

Después de activar la regla, un push directo a `main` debe ser rechazado por el
servidor. No lo pruebes con cambios reales; si quieres comprobarlo:

```powershell
git checkout main
git commit --allow-empty -m "test: comprobar proteccion"
git push origin main   # debe fallar
git reset --hard origin/main
```

El `reset` borra el commit de prueba local; no toca el remoto porque el push fue
rechazado.

## Urgencias

Si necesitas mergear sin el revisor, **no desactives la protección para siempre**:
pide al revisor que apruebe o, de forma temporal y consciente, desactiva la regla
desde Settings y vuelve a activarla al terminar.
