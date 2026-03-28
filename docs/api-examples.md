# API Examples

## Register

```bash
curl -X POST http://127.0.0.1:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"StrongPass123!","name":"Owner"}'
```

## Login

```bash
curl -X POST http://127.0.0.1:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"StrongPass123!"}'
```

## Save Provider Key

```bash
curl -X PUT http://127.0.0.1:4000/api/auth/provider-key \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"provider":"openai","apiKey":"sk-..."}'
```

## Analyze Command

```bash
curl -X POST http://127.0.0.1:4000/api/analyze \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"command":"fix checkout flow on https://example.com","includeAiSummary":false}'
```

## Autonomous Analyze Loop

```bash
curl -X POST http://127.0.0.1:4000/api/analyze \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"command":"fix login flow on https://example.com","provider":"claude","autoExecute":true,"maxIterations":2}'
```

## Action Execution

```bash
curl -X POST http://127.0.0.1:4000/api/actions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "actions":[
      {"type":"openUrl","url":"https://example.com"},
      {"type":"scroll","y":800},
      {"type":"extractText","selector":"body"},
      {"type":"screenshot"}
    ]
  }'
```

## Compatibility Browser Route

```bash
curl -X POST http://127.0.0.1:4000/api/browser \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"actions":[{"type":"openUrl","url":"https://example.com"}]}'
```
