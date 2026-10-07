# Configuração dos horários compartilhados

O agendamento usa o Firebase Realtime Database para que os horários ocupados apareçam em todos os celulares e computadores. Cada reserva grava somente a data e o horário; os dados do cliente continuam no armazenamento local deste navegador.

## Configurar

1. Crie um projeto em https://console.firebase.google.com/ e adicione um aplicativo Web.
2. Em Authentication > Sign-in method, habilite o provedor Anonymous.
3. Em Realtime Database, crie um banco e copie a URL exibida.
4. Copie `apiKey`, `authDomain`, `databaseURL`, `projectId` e `appId` da configuração do aplicativo para `firebase-config.js`, substituindo os valores `COLE_...`.
5. Em Realtime Database > Rules, publique estas regras:

```json
{
  "rules": {
    "occupiedSlots": {
      ".read": "auth != null",
      "$date": {
        "$time": {
          ".write": "auth != null && newData.val() === true && !data.exists()",
          ".validate": "newData.val() === true"
        }
      }
    }
  }
}
```

6. Publique novamente o site. Todos os dispositivos precisam acessar a mesma versão do site e o mesmo projeto Firebase.

As regras permitem criar um horário ocupado uma única vez e não permitem sobrescrever ou apagar uma reserva pelo site. Para liberar um horário cancelado, remova manualmente o valor correspondente em `occupiedSlots/AAAA-MM-DD/HH:MM` no Realtime Database.

O painel administrativo, histórico e dados dos clientes continuam locais e não são sincronizados por esta integração.
