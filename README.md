# blockchain-voting-backend

## Documentation

To view the OpenAPI documentation:

1.  Go to https://editor.swagger.io/
2.  Copy'n'paste the content of `docs/openapi.yaml` into the editor
3.  Enjoy!

## Build/run

To build this as a docker image run:

1.  `npm install`
2.  `tsc`
3.  `docker build -t blockchain-voting-backend .`

To run it on docker:

`docker run -it --rm --init -p 9999:9999 blockchain-voting-backend`

It'll listen on port `TCP 9999` for http requests. `CTRL-C` to stop it.

## Configuration

The backend can be configured by some environment variables:

Variable | Description | Default
--- | --- | ---
`DB_HOST` | Postgres database host | `localhost`
`DB_USER` | Postgres database user | `votingadmin`
`DB_PASSWORD` | Postgres database password | `supersecret`
`CONTRACT_ADDR` | Ethereum smart contract address | `0x50ba2e417d573fcd67fab8ee5d6d764b105cd5f7`
`PORT` | HTTP API port to listen on | 9999
`RPC_URL` | URL to the ethereum client RPC | `http://localhost:8545`
    