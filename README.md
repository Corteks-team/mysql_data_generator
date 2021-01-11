This is a tool to easily fill a SQL database.
It is able to analyse a schema and generate a `settings/schema.jsonc` which will be used to generate accurate data. It does its best to handle foreign keys.
You can provide a `settings/custom_schema.jsonc` to customize `settings/schema.jsonc` during the generation phase. This will allow you to override datatype for a column, force the use of a foreign key
or specify a list of values.

## functionalities

-   analyse a table and generate a schema
-   allow for customization on data types, foreign keys, values, uniqueness etc.
-   handle foreign keys
-   define a number of rows to generate per table
-   specify a seed to always generate the same dataset
-   disable/enable triggers during process

## 1. Analysis

The first step is to analyse your database to generate a `settings/schema.jsonc` by providing database credentials:

```
npm install -g @corteks/mysql-data-generator

mysqldatagen --db mysql://user:password@127.0.0.1:3306/database --analyse
```

If you want to customize the schema, modify the default `settings/custom_schema.jsonc` that has also be generated.

## 2. Data generation

Next step is to fill the database with randomly generated values:

```
mysqldatagen --db mysql://user:password@127.0.0.1:3306/database
```

For every tables listed in `settings/schema.jsonc`, the tool will:

-   get the values of foreign keys if needed
-   generate batches of 1000 rows
-   insert rows until it reaches the defined table limit
-   columns in table are ordered accordingly to your custom schema so you can rely on other column value in the same row.

Available options in `custom_schema.json`:

-   `settings`: Global settings
    -   `disableTriggers: boolean` // disable triggers per table during process and recreate them afterward
    -   `engine: "MariaDB"` // only MariaDB is supported for the time being but it should also be compatible with MySQL.
    -   `ignoredTables: string[]` // list of table name that should not be analysed nor filled
    -   `options: Array<[key: string]: any[]>` // an array of column options to configure specific generators for the whole file `generator` is an array of string to allow multiple settings at once
    -   `maxLengthValue: number?` // Hard limit of the maximum number of characters in `string` column type. This will override your custom column `max` value if it's bigger than `maxLengthValue`.
    -   `seed: number` // The seed used by the random generator. This is optional. filling process.
    -   `tablesToFill: string[]` // list of table name that should be analysed and filled. You can set this parameter or `ignoredTables` depending on the number of table to work with
    -   `values: [key: string]: any[]` // an object of user defined array of values
-   `tables: Table[]` // list of tables handled by the tool
    -   `Table.name: string` // table name
    -   `Table.lines: number` // Deprecated in favor of maxLines
    -   `Table.maxLines: number` // Maximum number of rows this table should contains
    -   `Table.addLines: number` // Number of rows to be inserted on a single run. The number of lines resulting in the table will not exceed `Table.maxLines`
    -   `Table.columns: Column[]` // list of columns handled by the tool
        -   `Column.name: string` // column name
        -   `Column.generator: bit | boolean | date | foreignKey | integer | real | time | string | values | function` // data type generator used for this column
        -   `Column.[key: string]: any[]` // list of options for this column
        -   `Column.foreignKey: { table: string, column: string, where: string }` // link to the table.column referenced by this foreign key. A custom clause can ba added to filter value from the foreign column
        -   `Column.values: string | any[] | { [key: string]: number }`
            // Name of the list of values to use for this column.
            // You can also directly specify an array of strings for values.
            // Or you can use an object to specify a ratio per value. Ratio will be a number between 0 and 1.
        -   `Column.customFunction: (rowIndex: number, row: { [key: string]: string | number }` // a string representing a javascript custom function. It will receive the row index and the full row as arguments.
