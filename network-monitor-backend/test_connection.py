import psycopg

# Spróbuj bez hasła
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

# Spróbuj z pustym hasłem
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

# Sprawdź co jest w docker-compose
print("\nCheck your docker-compose.yml - what is POSTGRES_PASSWORD?")
