# clovers-api

## Setup

`npm i`

Make a config.js file like this:
```
module.exports = {
  infuraAPI: 'asdfasdfasdfasdf',
  etherscanAPI: 'asdfasdfasdfasdf',
  networkId: '4' // rinkeby
}
```

## Run db

`rethinkdb`
- Manage at localhost:8080

## Run server

`npm run serve`
- On port 3333 for now


## Renew Cert
for now:
`ssh 104.131.181.241`
`service nginx stop`
`/opt/letsencrypt/certbot-auto renew`
`service nginx start`