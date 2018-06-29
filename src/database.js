class Database {

    

    constructor(host, user, password, dbname) {
        // Prepare PGSQL connection pool
        this.dbpool = new Pool({
            user: dbuser,
            host: dbhost,
            database: 'voting',
            password: dbpw,
            port: 5432
        });
    }
}