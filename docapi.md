# Requirements for Yii 2 documentation REST API

## General

- GET is only method
- JSON responses


## Endpoints

The endpoints are:

- class
- member
- constant
- property
- method

The endpoint corresponds to the kind of API entity for which the client requests documentation.

## Query parameters

param | type | description
---|---|---
`class` | string | name of a class, with or without (full or partial) namespace
`member` | string | name of a documented class constant or a a public or protected property or method
`const` | string | name of a documented class constant
`prop` | string | name of a public or protected property
`method` | string | name of a public or protected method

The table shows the requred and optional parameters for each endpoint.

endpoint | `class` | `member` | `const` | `prop` | `method`
---|---|---|---|---|---|---
class    | req |     |     |     |
member   |     | req |     |     |
constant | opt |     | req |     |     |
property | opt |     |     | req |     |
method   | opt |     |     |     | req |


## Queries and reponses

The server returns 400 if a required parameter is missing.

The server ignores parameters that are neither required nor optional.

### Queries

Queries can be divided into two kinds:

- Search queries:
    - Any query to the member endpoint.
    - A query to the class endpoint, unless `class` begins with `\`.
    - A query to the constant, property or method endpoint, unless `class` is present and begins with `\`.

    In these cases, the server searches for all classes that match the request parameters.

    Unless `class` begins with `\`, the server uses a reverse-prefix (postfix?) substring match,
    e.g. `class=X\Y` matches `\X\Y` and `\W\X\Y` but not `\X\Y\Z`.

    Searches involving `member`, `const`, `prop`, `method` are full string matches.

    All string matching is case insensitive.


- Fully-specified queries:
    - A query to the class endpoint including `class` parameter beginning with `\`
    - A query to the constant, property and method endpoints including `class` parameter beginning with `\`

    The member endpoint has no fully-specified queries.

### Responses

Responses to valid queries can be divided into three kinds:

- Not found, in the case that the server finds:
    - no match to a search query or
    - no API entity corresponding to a fully-specified query
- Class list, in the case that the server finds two or more matches to a search query
- Document response, in the case that the server finds one match to a search or fully-specified query

Not found has a 404 status code, while the other two have 200. Each 200 response contains
in its body a single JSON text and nothing else. In the JSON text is one object with one of the
two following properties:

- `classList`, an array of two or more strings, each being the fully-quallified class name in which the server found
the API entity requested in a search query.
- `docs` documentation for the API entity, either specified or found, containing:
    - `phpDoc`, an object containing the API entity's docblock organized as short and long descriptions
    and tags
    - `docUrl`, the canonical URL to the API entity's documentation in the yiiframework.com website
    - for the class endpoint, the following four properties, each being an array of fully-quallified class names:
        - `inheritance`, ancestor classes, in order
        - `implements` for interfaces
        - `uses` for traits
        - `subclasses` for descendent classes
    - for endpoints except class,
        - `signature`, the signature of the API element
        - `existsIn`, an array of fully-quallified
        names of classes in which the entity exists via either inheritance or trait
