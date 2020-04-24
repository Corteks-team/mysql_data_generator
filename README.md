This is a tool to easily fill a SQL database.  
It is able to analyse a schema and generate a `schema.json` which will be used to generate accurate data. It does its best to handle foreign keys.  
You can provide a `custom_schema.json` to customize `schema.json` during the analyse phase. This will allow you to override datatype for a column, force the use of a foreign key
or specify a list of values.  

The first step is to analyse your database to generate a `schema.json` by providing database credentials:
````
npm install -g

mysqldatagen -h 127.0.0.1 -u USER -p PASSWORD --db DATABASE -a
````

If you want to customize the schema, rename `schema.json` to `custom_schema.json`.
Update the `custom_schema.json` to fit your needs and every time you will run:
````
mysqldatagen -h 127.0.0.1 -u USER -p PASSWORD --db DATABASE -a
````

The `schema.json` will now take in account your modification.

Next step is to fill the database with randomly generated values:
````
mysqldatagen -h 127.0.0.1 -u USER -p PASSWORD --db DATABASE
````

For every tables listed in `schema.json`, the tool will:
* empty the table
* get the values of foreign keys if needed
* generate batches of 10000 rows
* insert rows until it reaches the defined table limit

Available options in `custom_schema.json`:
* `maxCharLength: number` // maximum length of every char columns. This can speed up 
filling process.
* `ignoredTables: string[]` // list of table name that should not be analysed
* `tables: Table[]` // list of tables handled by the tool
* `Table.name: string` // table name
* `Table.lines: number` // number of rows to insert
* `Table.columns: Column[]` // list of columns handled by the tool
* `Column.name: string` // column name
* `Column.generator: string` // data type generator used for this column
* `Column.options: [key: string]: any[]` // list of options for this column
* `Column.foreignKey: { table: string, column: string }` // link to the table.column referenced by this foreign key
* `Column.values: string` // Name of the list of values to use for this column
* `values: [key: string]: any[]` // an object of user defined array of values. Can be specified by using `column.values: "key"`