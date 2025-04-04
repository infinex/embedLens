FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    postgresql-server-dev-16 \
    wget \
    ca-certificates && \
    wget https://github.com/pgvector/pgvector/archive/refs/tags/v0.5.1.tar.gz && \
    tar xzf v0.5.1.tar.gz && \
    cd pgvector-0.5.1 && \
    make && make install && \
    echo "CREATE EXTENSION vector;" > /docker-entrypoint-initdb.d/00-create-vector-extension.sql && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /v0.5.1.tar.gz /pgvector-0.5.1
