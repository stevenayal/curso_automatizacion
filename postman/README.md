# Postman y Newman

`aiquaa Sandbox API.json` es la coleccion de **referencia** del sandbox: trae los endpoints REST
por modulo, el sandbox SQL (`/api/v1/sql/select`, `/api/v1/sql/update`) y la carpeta
`E2E - Flujos con validacion SQL` con el patron pre-request/post-response ya implementado.

Cada grupo debe:

- crear su propia coleccion en `grupos/grupo-0N-modulo/postman/` (duplicando o extendiendo esta)
- agregar assertions reales sobre su modulo
- manejar variables de coleccion y environment (nunca hardcodear la API key)
- aplicar el patron SQL REST dinamico — ver [`docs/TAREA-SQL-REST-DINAMICO.md`](../docs/TAREA-SQL-REST-DINAMICO.md)
  y la guia [`docs/patron-postman-pre-post-request.pdf`](../docs/patron-postman-pre-post-request.pdf)
- guardar la evidencia de la corrida en `evidence/` de su grupo

`local.postman_environment.json` es el environment de ejemplo: copiarlo y completar `baseUrl` y
`apiKey` localmente. La API key no se commitea.

Ejecutar una coleccion con Newman:

```bash
npx newman run "grupos/grupo-0N-modulo/postman/mi-coleccion.json" \
  --env-var "baseUrl=https://aiquaa-sandbox-api.vercel.app" \
  --env-var "apiKey=$API_KEY"
```

## Coleccion de practica

Para practicar antes de armar la coleccion del grupo, ver [`practica/`](./practica/README.md):
coleccion guiada sobre `/api/v2` con ejemplos resueltos, ejercicios para completar y limpieza
de datos. Se corre con `npm run test:practica`.
