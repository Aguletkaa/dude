import psycopg2

try:
    conn = psycopg2.connect(
        host='localhost',
        port=5432,
        database='network_monitor',
        user='postgres',
        password='postgres123',
        client_encoding='utf8'
    )
    
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM users")
    count = cursor.fetchone()[0]
    
    print(f"SUCCESS! Database connected.")
    print(f"Users in database: {count}")
    
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """)
    
    print("\nTables:")
    for row in cursor.fetchall():
        print(f"  - {row[0]}")
    
    cursor.close()
    conn.close()
    
    print("\nDatabase is READY!")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
