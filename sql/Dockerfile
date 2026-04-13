FROM postgres:alpine
ENV POSTGRES_INITDB_ARGS="--lc-collate=C --lc-ctype=C"
COPY project.sql /docker-entrypoint-initdb.d/