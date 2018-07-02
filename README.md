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
