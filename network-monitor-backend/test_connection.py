import psycopg

try:
    print("Trying connection without password...")
    conn = psycopg.connect(
        host='localhost',
        port=5432,
        dbname='network_monitor',
        user='postgres'
    )
    print("SUCCESS!")
    conn.close()
except Exception as e:
    print(f"Failed: {e}")

try:
    print("\nTrying with empty password...")
    conn = psycopg.connect(
        host='localhost',
        port=5432,
        dbname='network_monitor',
        user='postgres',
        password=''
    )
    print("SUCCESS!")
    conn.close()
except Exception as e:
    print(f"Failed: {e}")

print("\nCheck your docker-compose.yml - what is POSTGRES_PASSWORD?")
