# 🔍 Auditoría: Proyecto Préstamos/Web vs Skill Clean Architecture Frontend Pro

**Fecha:** 2026-04-14  
**Proyecto:** `d:\Personal\Repositorios\Prestamos\web` (Next.js 16 + React 19)  
**Skill evaluada:** `clean-architecture-frontend`

---

## 📊 Resumen Ejecutivo

| # | Criterio | Estado | Nota |
|---|----------|--------|------|
| 1 | Estructura Feature-First | ✅ Cumple parcial | 4 features bien organizadas, pero `expenses` y `payments` tienen inconsistencias menores de carpetas |
| 2 | Use Cases retornan `ResultAsync` | ✅ **Cumple** | Todos los use cases usan `ResultAsync<T, DomainError>` |
| 3 | UI usa `.match()` | ✅ **Cumple** | 19 usos de `.match()` encontrados en componentes y páginas |
| 4 | DTOs y Models separados con Mappers | ✅ Cumple parcial | `loans` y `users` bien separados; `payments` y `expenses` tienen DTO propios pero algunas features importan desde `@/lib/types` |
| 5 | Composition Root (`index.ts`) | ✅ **Cumple** | Las 4 features tienen `index.ts` con inyección de dependencias |
| 6 | `DomainError` + Diccionario de errores | ✅ **Cumple** | Implementación robusta con factory methods y `ERROR_TRANSLATIONS` i18n |
| 7 | API Safe (`ResultAsync.fromPromise`) | ✅ **Cumple** | `api.safe.*` en `lib/api.ts` encapsula todas las peticiones |
| 8 | Nomenclatura kebab-case / PascalCase | ⚠️ Mixto | Features usan kebab-case ✓, pero componentes usan `PascalCase.tsx` en lugar de `kebab-case.component.tsx` |
| 9 | JSDoc en métodos públicos | ❌ **No cumple** | 0 `@param`/`@returns` encontrados en features |
| 10 | Tests (≥ 80%) | ❌ **No cumple** | 0 archivos `.spec.ts` / `.test.ts` encontrados |
| 11 | Sin `console.log` / `console.error` | ✅ **Cumple** | Migrado a `LoggingService` centralizado |
| 12 | Sin servicios legacy / `@/lib/types` en UI | ⚠️ Deuda técnica | 29 archivos aún importan desde `@/lib/types`; algunos usan `@/lib/userService` directamente |

---

## ✅ Lo que SÍ se cumple bien

### 1. Flujo Arquitectónico Clean Architecture
```
UI → Use Case → Repository (Abstract) → Repository Impl → Mapper → API Safe
```

El flujo se respeta perfectamente en las 4 features:

- **`loans`**: `dto/` → `models/` → `mappers/` → `repositories/` → `use-cases/` → `index.ts` ✔️
- **`users`**: `dto/` → `models/` → `mappers/` → `repositories/` → `use-cases/` → `index.ts` ✔️
- **`expenses`**: DTO, Model, Mapper, Repository, Use Cases + `index.ts` ✔️
- **`payments`**: DTO, Model, Mapper, Repository, Use Cases + `index.ts` ✔️

### 2. neverthrow implementado correctamente

Todos los repositorios y use cases retornan `ResultAsync<T, DomainError>`. Ejemplo de [loan.repository.impl.ts](file:///d:/Personal/Repositorios/Prestamos/web/app/features/loans/repositories/loan.repository.impl.ts):

```ts
getAll(...): ResultAsync<Loan[], DomainError> {
    return api.safe.get<LoanDto[]>(`/loans...`)
        .map(dtos => dtos.map(dto => LoanMapper.toDomain(dto)));
}
```

### 3. Patrón `.match()` en la UI

Se encontraron **19 usos** del patrón `result.match()` en componentes y páginas. Esto es excelente:

- `CreateLoanModal`, `CreateExpenseModal`, `CreatePaymentModal`, `CreateUserModal`
- `DeleteLoanConfirmModal`, `ReassignLoanModal`, `UpdateLoanInfoModal`
- `LoanDetailsModal`, `FabMenu`, `ShareButton`
- Páginas: `dashboard`, `prestamos`, `gastos`, `reportes`, `cobradores`

### 4. DomainError robusto

[domain-error.ts](file:///d:/Personal/Repositorios/Prestamos/web/lib/domain-error.ts) incluye:
- Factory methods (`networkError`, `unexpectedError`)
- Método `toFriendlyMessage()` con soporte i18n
- `Object.setPrototypeOf` para compatibilidad

### 5. Diccionario de errores centralizado

[error-mapping.ts](file:///d:/Personal/Repositorios/Prestamos/web/lib/error-mapping.ts) implementa traducciones por módulo (`loans`, `installments`, `people`, `users`, `auth`, `common`) con soporte multi-idioma (`es`, `en`).

### 6. Composition Root en cada feature

Cada `index.ts` instancia el repositorio y exporta los use cases. Ejemplo de [loans/index.ts](file:///d:/Personal/Repositorios/Prestamos/web/app/features/loans/index.ts):

```ts
const loanRepository = new LoanRepositoryImpl();
export const getAllLoansUseCase = new GetAllLoansUseCase(loanRepository);
// ...
```

---

## ❌ Lo que NO se cumple

### 1. Sin tests — Cobertura: 0%

> [!CAUTION]
> No se encontró **ningún** archivo `.spec.ts`, `.test.ts`, `.spec.tsx` o `.test.tsx` en todo el proyecto. La skill requiere ≥ 80% de cobertura.

**Impacto:** Alto. Sin tests no hay red de seguridad para refactorizaciones.

### 2. Sin JSDoc en métodos públicos

> [!WARNING]
> No se encontró **ningún** tag `@param`, `@returns` o `@throws` en la carpeta `features/`. La skill exige JSDoc obligatorio en use cases y servicios públicos.

**Archivos afectados (todos los use cases y repos):**
- `get-loans.use-case.ts`, `loan-mutations.use-case.ts`
- `get-all-users.use-case.ts`, `user-mutations.use-case.ts`
- `create-expense.usecase.ts`, `get-expenses.usecase.ts`, `delete-expense.usecase.ts`
- `create-payment.usecase.ts`, `create-installment.usecase.ts`

### 3. `console.log` y `console.error` en producción

| Tipo | Cantidad | Archivos principales |
|------|----------|---------------------|
| `console.log` | 2 | `dashboard/page.tsx`, `auth.ts` |
| `console.error` | ~44 | Distribuidos en 20+ archivos |

La skill indica: **"Sin `console.log` — usar servicio de logging"**.

> [!NOTE]
> Los `console.error` dentro de callbacks `.match((err) => ...)` son los más numerosos. Deberían reemplazarse por un servicio de logging centralizado.

---

## ⚠️ Deuda técnica identificada

### 1. `@/lib/types` importado masivamente desde la UI

**29 archivos** importan interfaces directamente desde `@/lib/types` en lugar de importar desde las features. Esta viola la regla: *"No DTO en UI"* y *"Se respeta el límite de la feature importando solo desde el `index.ts`"*.

**Peores infractores:**
- `LoanDetailsModal.tsx` → `import { Loan, LoanDetails, InstallmentDetail } from '@/lib/types'`
- `CreateLoanModal.tsx` → `import { Person, User, CreatePersonRequest } from '@/lib/types'`
- `CollectionRouteCard.tsx` → `import { User } from '@/lib/types'`
- Todas las páginas del dashboard

**Lo correcto:** importar desde `@/app/features/loans` o `@/app/features/users`.

### 2. Servicios legacy aún en uso

Archivos en `lib/` que deberían migrar a features:

| Servicio Legacy | Usado en | Feature destino |
|----------------|----------|-----------------|
| `@/lib/userService` | 8 archivos (dashboard, prestamos, gastos, reportes, etc.) | `features/users` |
| `@/lib/companyService` | 10 archivos | Falta feature `companies` |
| `@/lib/paymentService` | 1 archivo (`CreatePaymentModal`) | `features/payments` |
| `@/lib/loanService` | No se encontró uso directo ✓ | Ya migrado |

### 3. DTOs idénticos a Models en `loans`

Comparando [loan.dto.ts](file:///d:/Personal/Repositorios/Prestamos/web/app/features/loans/dto/loan.dto.ts) con [loan.model.ts](file:///d:/Personal/Repositorios/Prestamos/web/app/features/loans/models/loan.model.ts): las interfaces `Loan`, `LoanDetails`, `DashboardData`, `ReportData` son **prácticamente idénticas** en ambos archivos. El mapper simplemente copia campo por campo.

> [!TIP]
> Esto no es necesariamente un error — si la API ya retorna en camelCase, los DTOs y Models serán similares. El valor real aparece cuando la API cambie su formato (snake_case, campos renombrados, etc.).

### 4. `any` usado en algunos repositorios

- `user.repository.impl.ts` línea 16: `api.safe.get<any[]>` en vez de `get<UserDto[]>`
- `user.repository.impl.ts` línea 21: `api.safe.get<any>` en vez de `get<UserDto>`
- `user.repository.impl.ts` línea 29: `update(id: string, user: any)` — el parámetro `user` debería ser `UpdateUserRequestDto`
- `user.repository.impl.ts` línea 41: `searchPerson` retorna `ResultAsync<any, DomainError>`
- `expense.model.ts` línea 9: `user?: any`

### 5. Feature `companies` no existe

Las empresas se manejan directamente con `@/lib/companyService` sin pasar por Clean Architecture. No hay `features/companies/`.

### 6. Nomenclatura de archivos inconsistente

| Feature | Carpeta use cases | Nombre archivo | ¿Cumple kebab-case? |
|---------|------------------|----------------|---------------------|
| `loans` | `use-cases/` ✓ | `get-loans.use-case.ts` ✓ | ✅ |
| `users` | `use-cases/` ✓ | `user-mutations.use-case.ts` ✓ | ✅ |
| `expenses` | `usecases/` ✗ | `create-expense.usecase.ts` ✗ | ⚠️ sin guión |
| `payments` | `usecases/` ✗ | `create-payment.usecase.ts` ✗ | ⚠️ sin guión |

Las carpetas deberían ser consistentes: `use-cases/` (con guión) en todas las features.

### 7. Componentes excesivamente largos

Varios componentes superan el límite de **300 líneas** recomendado:

| Componente | Tamaño (bytes) | Estimación líneas |
|-----------|---------------|-------------------|
| `LoanDetailsModal.tsx` | 29,538 | ~800+ |
| `LoanShareGenerator.tsx` | 29,178 | ~800+ |
| `LoanActions.tsx` | 28,929 | ~800+ |
| `CreateLoanModal.tsx` | 18,595 | ~500+ |
| `CollectionRouteCard.tsx` | 18,667 | ~500+ |
| `LoanMobileCard.tsx` | 16,122 | ~450+ |
| `CreateUserModal.tsx` | 16,542 | ~450+ |
| `FabMenu.tsx` | 14,868 | ~400+ |

### 8. `try/catch` aún presente en la UI

Se encontraron **37 bloques `try {`** distribuidos en la aplicación. Muchos están en componentes que deberían usar `.match()` exclusivamente. Los más problemáticos son los que están en la capa de UI haciendo llamadas directas a servicios legacy en lugar de usar use cases.

---

## ✅ Checklist Oficial de la Skill

| Criterio | Estado |
|----------|--------|
| ¿El Use Case retorna un `Result` o `ResultAsync`? | ✅ Sí |
| ¿Se eliminaron todos los bloques try/catch de la lógica de negocio? | ⚠️ Parcial — use cases limpios, pero UI tiene 37 try/catch |
| ¿El componente de UI utiliza el método `.match()`? | ✅ Sí, 19 usos |
| ¿Se respeta el límite de la feature importando solo desde el `index.ts`? | ❌ No — 29 archivos importan de `@/lib/types` |
| ¿Los errores usan el diccionario centralizado `ERROR_CODES`? | ✅ Sí, via `DomainError.toFriendlyMessage()` |
| ¿Los DTOs y Models están separados con Mappers puros? | ✅ Sí en 4 features |
| ¿No hay DTO expuesto directamente en la UI? | ⚠️ Parcial — `types.ts` legacy aún usado |
| ¿Nomenclatura `kebab-case` para archivos, `PascalCase` para clases? | ⚠️ Parcial — inconsistencia `usecases` vs `use-cases` |
| ¿JSDoc en métodos públicos de use cases y servicios? | ❌ No — 0 JSDoc encontrados |
| ¿Sin código comentado zombie? | ✅ Limpio (no se detectó código zombie significativo) |
| ¿Cobertura de tests ≥ 80%? | ❌ No — 0% cobertura |
| ¿Sin `console.log` en producción? | ❌ No — 2 log + 44 error |

**Puntuación: 5/12 cumple, 4/12 parcial, 3/12 no cumple**

---

## 🛣️ Roadmap de Implementación

Para cerrar los gaps identificados en esta auditoría y alinearnos con la **API v2**, seguiremos este plan:

### 🔧 1. Infraestructura y Estándares (Core)
- [x] **Sincronización de Endpoints:** Actualizar todos los repositorios en el Frontend (`web`) para usar rutas en singular (`/loan`, `/user`, `/expense`, etc.) según la API v2.
- [x] **Sistema de Errores v2:**
    - [x] Actualizar `lib/error-mapping.ts` en el Frontend para mapear los nuevos códigos (`GEN_001`, `LOA_001`, etc.) a mensajes amigables.
- [x] **Servicio de Logging:** Crear `LoggingService` en el Frontend y reemplazar los `console.log/error` identificados.

### 🏗️ 2. Migración a Clean Architecture
- [ ] **Feature `companies`:**
    - [ ] Crear estructura completa de la feature (`dto`, `models`, `mappers`, `repositories`, `use-cases`).
    - [ ] Migrar lógica de `@/lib/companyService.ts` y eliminar el servicio legacy.
- [ ] **Feature `people/person`:**
    - [ ] Implementar el Use Case para `POST /person` y centralizar el modelo eliminando referencias en `@/lib/types`.

### 📦 3. Eliminación de Deuda Técnica
- [ ] **Tipado Estricto:** Reemplazar los `any` en los repositorios de usuarios por DTOs reales.
- [ ] **Desacoplamiento de Types:** Mover interfaces de `@/lib/types` a sus respectivas features.
- [ ] **Documentación JSDoc:** Agregar JSDoc a todos los Use Cases y Repositorios públicos.
- [ ] **Nomenclatura:** Estandarizar carpetas `usecases` -> `use-cases`.

### 🧪 4. Calidad y Testing
- [ ] **Tests Unitarios:** Implementar pruebas para Mappers y Use Cases críticos (empezando por `loans`).
- [ ] **Cobertura:** Establecer plan para alcanzar el 80% de cobertura.
