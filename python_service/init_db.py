import psycopg2
import numpy as np
import time

# Connect to your database
conn = psycopg2.connect(
    dbname="example",
    password="example",
    user="example",
    host="pgvector"
)

# Create a table with a vector column
with conn.cursor() as cur:
    cur.execute("""
        CREATE EXTENSION IF NOT EXISTS vector;

        DROP TABLE IF EXISTS items;

        CREATE TABLE IF NOT EXISTS items (
            id serial PRIMARY KEY,
            embedding vector(1024)
        );

        CREATE INDEX ON items
        USING hnsw ((embedding::halfvec(1024)) halfvec_l2_ops);
    """)
    conn.commit()

# Insert data into the table
num_embeddings = 10000
embedding_dimension = 1024

embeddings = np.random.rand(num_embeddings, embedding_dimension).astype(np.float32)

chunk_size = 10000
num_chunks = num_embeddings // chunk_size

with conn.cursor() as cur:
    for chunk in range(num_chunks):
        start_time = time.time()
        args_str = ','.join(cur.mogrify("(%s)", (embeddings[i].tolist(),)).decode('utf-8') for i in range(chunk * chunk_size, (chunk + 1) * chunk_size))
        cur.execute("INSERT INTO items (embedding) VALUES " + args_str)
        conn.commit()
        end_time = time.time()
        print(f"Chunk {chunk + 1}/{num_chunks} inserted in {end_time - start_time:.2f} seconds")

# Insert remaining embeddings if any
remaining_embeddings = num_embeddings % chunk_size
if remaining_embeddings > 0:
    start_time = time.time()
    args_str = ','.join(cur.mogrify("(%s)", (embeddings[i].tolist(),)).decode('utf-8') for i in range(num_chunks * chunk_size, num_embeddings))
    cur.execute("INSERT INTO items (embedding) VALUES " + args_str)
    conn.commit()
    end_time = time.time()
    print(f"Remaining {remaining_embeddings} embeddings inserted in {end_time - start_time:.2f} seconds")

# Calculate the size used for the table and the columns
with conn.cursor() as cur:
    cur.execute("""
        SELECT pg_size_pretty(pg_total_relation_size('items')) AS total_size,
               pg_size_pretty(pg_relation_size('items')) AS table_size,
               pg_size_pretty(pg_total_relation_size('items') - pg_relation_size('items')) AS index_size;
    """)
    size_info = cur.fetchone()
    print(f"Total size of 'items' table: {size_info[0]}")
    print(f"Table size of 'items' table: {size_info[1]}")
    print(f"Index size of 'items' table: {size_info[2]}")

# Close the connection
conn.close()
