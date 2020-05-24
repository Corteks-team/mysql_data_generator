This is a tool to easily fill a SQL database.  
It is able to analyse a schema and generate a `schema.json` which will be used to generate accurate data. It does its best to handle foreign keys.  
You can provide a `custom_schema.json` to customize `schema.json` during the analyse phase. This will allow you to override datatype for a column, force the use of a foreign key
or specify a list of values.  

## functionalities
* analyse a table and generate a schema
* allow for customization on data types, foreign keys, values, uniqueness etc.
* handle foreign keys
* define a number of rows to generate per table

## 1. Analysis
The first step is to analyse your database to generate a `schema.json` by providing database credentials:
````
npm install -g @corteks/mysql-data-generator

mysqldatagen --host 127.0.0.1 --user USER --password PASSWORD --database DATABASE --analyse
````

If you want to customize the schema, rename `schema.json` to `custom_schema.json`.
Update the `custom_schema.json` to fit your needs and run analysis again:
````
mysqldatagen --host 127.0.0.1 --user USER --password PASSWORD --database DATABASE --analyse
````

The `schema.json` will now take in account your modification.

## 2. Data generation
Next step is to fill the database with randomly generated values:
````
mysqldatagen --host 127.0.0.1 --user USER --password PASSWORD --database DATABASE
````

For every tables listed in `schema.json`, the tool will:
* get the values of foreign keys if needed
* generate batches of 1000 rows
* insert rows until it reaches the defined table limit

Available options in `custom_schema.json`:
* `maxCharLength: number` // maximum length of every char columns. This can speed up 
filling process.
* `minDate: string` // Lower bound date for all date ish columns. Format: 'dd-MM-YYYY'
* `ignoredTables: string[]` // list of table name that should not be analysed nor filled
* `tables: Table[]` // list of tables handled by the tool
* `Table.name: string` // table name
* `Table.lines: number` // number of rows to insert
* `Table.columns: Column[]` // list of columns handled by the tool
* `Column.name: string` // column name
* `Column.generator: string` // data type generator used for this column
* `Column.options: [key: string]: any[]` // list of options for this column
* `Column.foreignKey: { table: string, column: string, where: string }` // link to the table.column referenced by this foreign key. A custom clause can ba added to filter value from the foreign column
* `Column.values: string` // Name of the list of values to use for this column. You can also directly specify an array of strings for values
* `values: [key: string]: any[]` // an object of user defined array of values