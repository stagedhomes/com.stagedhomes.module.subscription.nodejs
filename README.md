# Backend NodeJS, for SH Auto Renewal Subscriptions

## Build Image
1. docker build -t sh-subs-api:<version> .
   example:
     ```docker build -t sh-subs-api:0.0.1 .```
2. Update docker-compose.yaml to use new image.

## RELEASE NOTES
0.0.1 - Initial

---

## run it
we need to tell it to rebuild the container when we run the docker compose:

### dev
```
docker-compose up --build
```

### production
```
docker-compose -f docker-compose.prod.yml up --build
```

--- 

(note: i purposly left out the -d so i have an active running log)

note also, the `_secrets` dir, it contains stuff that doesn't get checked in
