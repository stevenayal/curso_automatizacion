# Grupos — Tarea BDD (Grupo 2, Banca)

Cada subcarpeta es el **vertical slice** de un grupo: contiene todo lo que ese grupo necesita
para su módulo (BDD, API, UI, page objects, evidencias), separado del resto para que cada equipo
trabaje y entregue su PR sin pisar el trabajo de los demás.

Cada estudiante elige **un solo grupo**, máximo **3 integrantes** por grupo.

| Grupo | Carpeta / Rama | Módulo | Alcance |
|---|---|---|---|
| 01 | `grupo-01-cuentas-bancarias` | Cuentas Bancarias | cuentas, saldos, estados y movimientos |
| 02 | `grupo-02-tarjetas` | Tarjetas de Crédito/Débito | tarjetas, límites, disponible, estado y vencimiento |
| 03 | `grupo-03-prestamos` | Préstamos | préstamos, cuotas, saldo, vencimientos y estado |
| 04 | `grupo-04-transferencias-pagos` | Transferencias y Pagos | transferencias, beneficiarios, importes y estados |
| 05 | `grupo-05-ahorros-depositos` | Ahorros y Depósitos | ahorros, depósitos, tasas, plazos y vencimientos |
| 05-01 | `grupo-05-01-ahorros-depositos` (rama `grupo_5`) | Ahorros y Depósitos | trabajo del equipo en una carpeta independiente |

> Los módulos de **Préstamos** y **Ahorros/Depósitos** todavía no tienen endpoints REST
> publicados en la sandbox API: esos grupos arrancan por BDD + validación SQL. Ver el README de
> cada grupo.

## Estructura de cada carpeta

```
grupos/grupo-0N-modulo/
├── README.md            # módulo, integrantes, alcance, endpoints, checklist de entrega
├── features/            # .feature del módulo (Gherkin en español)
├── tests/e2e/           # specs Playwright del módulo
├── playwright/pages/    # Page Objects del módulo (extienden BasePage)
├── postman/             # colección Postman/Newman del grupo
└── evidence/            # capturas, videos, salidas de Newman
```

## Flujo de entrega

1. Crear la rama del grupo: `git checkout -b grupo-0N-modulo`
2. Trabajar únicamente dentro de `grupos/grupo-0N-modulo/`
3. Completar el checklist del `README.md` de la carpeta (ver también [ENTREGABLES.md](../ENTREGABLES.md))
4. `npm run test:e2e` y `npm run test:bdd` corren los tests de todos los grupos, gracias a la
   configuración de [`playwright.config.ts`](../playwright.config.ts) y [`cucumber.js`](../cucumber.js)
5. Abrir 1 Pull Request de `grupo-0N-modulo` hacia `main` usando la plantilla del repo
