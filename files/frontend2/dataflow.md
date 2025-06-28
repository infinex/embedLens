curl -X 'GET' \
  'http://localhost:8000/api/projects/' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer asdasd'
Output:
  [
  {
    "name": "string",
    "description": "string",
    "project_id": 1,
    "user_id": 1,
    "created_at": "2025-05-02T08:03:44.683799Z"
  },
  {
    "name": "string",
    "description": "string",
    "project_id": 2,
    "user_id": 1,
    "created_at": "2025-05-09T06:15:22.936102Z"
  }
]




curl -X 'POST' \
  'http://localhost:8000/api/projects/' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer asdasd' \
  -H 'Content-Type: application/json' \
  -d '{
  "name": "string",
  "description": "string"
}'
Output: 
{
  "name": "string",
  "description": "string",
  "project_id": 4,
  "user_id": 1,
  "created_at": "2025-06-27T07:24:55.203361Z"
}


curl -X 'GET' \
  'http://localhost:8000/api/files/project/1' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer asdasd'

  Output:

  {
    "filename": "d0f36323-3502-4930-86ab-dc2c12028672.csv",
    "file_type": "csv",
    "file_id": 1,
    "original_filename": "people-100.csv",
    "project_id": 1,
    "columns": {
      "names": [
        "Index",
        "User Id",
        "First Name",
        "Last Name",
        "Sex",
        "Email",
        "Phone",
        "Date of birth",
        "Job Title"
      ],
      "types": {
        "Index": "int64",
        "User Id": "object",
        "First Name": "object",
        "Last Name": "object",
        "Sex": "object",
        "Email": "object",
        "Phone": "object",
        "Date of birth": "object",
        "Job Title": "object"
      },
      "sample_size": 100,
      "numeric_columns": [
        "Index"
      ],
      "text_columns": [
        "User Id",
        "First Name",
        "Last Name",
        "Sex",
        "Email",
        "Phone",
        "Date of birth",
        "Job Title"
      ]
    },
    "created_at": "2025-05-02T08:03:55.995992Z",
    "row_count": 100
  },
  {
    "filename": "da6b4260-74a5-46ef-8e5d-37bb7e42742c.csv",
    "file_type": "csv",
    "file_id": 2,
    "original_filename": "selected_rows (1).csv",
    "project_id": 1,
    "columns": {
      "names": [
        "Name",
        "Age",
        "City"
      ],
      "types": {
        "Name": "object",
        "Age": "int64",
        "City": "object"
      },
      "sample_size": 3,
      "numeric_columns": [
        "Age"
      ],
      "text_columns": [
        "Name",
        "City"
      ]
    },
    "created_at": "2025-05-09T07:59:44.041586Z",
    "row_count": 3
  },
  {
    "filename": "feefb50d-e8bd-4e8d-91c1-052c5f5a2dcd.csv",
    "file_type": "csv",
    "file_id": 3,
    "original_filename": "customers-10000.csv",
    "project_id": 1,
    "columns": {
      "names": [
        "Index",
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ],
      "types": {
        "Index": "int64",
        "Customer Id": "object",
        "First Name": "object",
        "Last Name": "object",
        "Company": "object",
        "City": "object",
        "Country": "object",
        "Phone 1": "object",
        "Phone 2": "object",
        "Email": "object",
        "Subscription Date": "object",
        "Website": "object"
      },
      "sample_size": 10000,
      "numeric_columns": [
        "Index"
      ],
      "text_columns": [
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ]
    },
    "created_at": "2025-05-09T08:00:14.158543Z",
    "row_count": 10000
  },
  {
    "filename": "b0747c7f-031a-4244-b7aa-00c227e53f9f.csv",
    "file_type": "csv",
    "file_id": 4,
    "original_filename": "customers-10000.csv",
    "project_id": 1,
    "columns": {
      "names": [
        "Index",
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ],
      "types": {
        "Index": "int64",
        "Customer Id": "object",
        "First Name": "object",
        "Last Name": "object",
        "Company": "object",
        "City": "object",
        "Country": "object",
        "Phone 1": "object",
        "Phone 2": "object",
        "Email": "object",
        "Subscription Date": "object",
        "Website": "object"
      },
      "sample_size": 10000,
      "numeric_columns": [
        "Index"
      ],
      "text_columns": [
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ]
    },
    "created_at": "2025-05-09T08:19:04.882203Z",
    "row_count": 10000
  },
  {
    "filename": "7a496b71-c1f8-45e9-b3da-01060d42a094.csv",
    "file_type": "csv",
    "file_id": 5,
    "original_filename": "customers-10000.csv",
    "project_id": 1,
    "columns": {
      "names": [
        "Index",
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ],
      "types": {
        "Index": "int64",
        "Customer Id": "object",
        "First Name": "object",
        "Last Name": "object",
        "Company": "object",
        "City": "object",
        "Country": "object",
        "Phone 1": "object",
        "Phone 2": "object",
        "Email": "object",
        "Subscription Date": "object",
        "Website": "object"
      },
      "sample_size": 10000,
      "numeric_columns": [
        "Index"
      ],
      "text_columns": [
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ]
    },
    "created_at": "2025-05-09T08:19:28.205212Z",
    "row_count": 10000
  },
  {
    "filename": "d401aba9-624e-4332-9e0d-271fec9026d6.csv",
    "file_type": "csv",
    "file_id": 6,
    "original_filename": "customers-10000.csv",
    "project_id": 1,
    "columns": {
      "names": [
        "Index",
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ],
      "types": {
        "Index": "int64",
        "Customer Id": "object",
        "First Name": "object",
        "Last Name": "object",
        "Company": "object",
        "City": "object",
        "Country": "object",
        "Phone 1": "object",
        "Phone 2": "object",
        "Email": "object",
        "Subscription Date": "object",
        "Website": "object"
      },
      "sample_size": 10000,
      "numeric_columns": [
        "Index"
      ],
      "text_columns": [
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ]
    },
    "created_at": "2025-05-09T08:33:25.980404Z",
    "row_count": 10000
  },
  {
    "filename": "fc16c48c-9471-4190-a3dc-7a5c4d6f2e2f.csv",
    "file_type": "csv",
    "file_id": 7,
    "original_filename": "customers-10000.csv",
    "project_id": 1,
    "columns": {
      "names": [
        "Index",
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ],
      "types": {
        "Index": "int64",
        "Customer Id": "object",
        "First Name": "object",
        "Last Name": "object",
        "Company": "object",
        "City": "object",
        "Country": "object",
        "Phone 1": "object",
        "Phone 2": "object",
        "Email": "object",
        "Subscription Date": "object",
        "Website": "object"
      },
      "sample_size": 10000,
      "numeric_columns": [
        "Index"
      ],
      "text_columns": [
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ]
    },
    "created_at": "2025-05-09T08:39:24.519803Z",
    "row_count": 10000
  },
  {
    "filename": "62bf84ae-2174-4305-97fd-d2940b23b36f.csv",
    "file_type": "csv",
    "file_id": 8,
    "original_filename": "customers-10000.csv",
    "project_id": 1,
    "columns": {
      "names": [
        "Index",
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ],
      "types": {
        "Index": "int64",
        "Customer Id": "object",
        "First Name": "object",
        "Last Name": "object",
        "Company": "object",
        "City": "object",
        "Country": "object",
        "Phone 1": "object",
        "Phone 2": "object",
        "Email": "object",
        "Subscription Date": "object",
        "Website": "object"
      },
      "sample_size": 10000,
      "numeric_columns": [
        "Index"
      ],
      "text_columns": [
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ]
    },
    "created_at": "2025-05-09T08:41:35.505865Z",
    "row_count": 10000
  },
  {
    "filename": "fd25db88-bebb-486c-9f27-fd57ef17f7e0.csv",
    "file_type": "csv",
    "file_id": 9,
    "original_filename": "customers-10000.csv",
    "project_id": 1,
    "columns": {
      "names": [
        "Index",
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ],
      "types": {
        "Index": "int64",
        "Customer Id": "object",
        "First Name": "object",
        "Last Name": "object",
        "Company": "object",
        "City": "object",
        "Country": "object",
        "Phone 1": "object",
        "Phone 2": "object",
        "Email": "object",
        "Subscription Date": "object",
        "Website": "object"
      },
      "sample_size": 10000,
      "numeric_columns": [
        "Index"
      ],
      "text_columns": [
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ]
    },
    "created_at": "2025-05-09T08:43:11.017820Z",
    "row_count": 10000
  },
  {
    "filename": "21fe7723-8d33-43a5-a40f-7f9a0efb225a.csv",
    "file_type": "csv",
    "file_id": 10,
    "original_filename": "customers-10000.csv",
    "project_id": 1,
    "columns": {
      "names": [
        "Index",
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ],
      "types": {
        "Index": "int64",
        "Customer Id": "object",
        "First Name": "object",
        "Last Name": "object",
        "Company": "object",
        "City": "object",
        "Country": "object",
        "Phone 1": "object",
        "Phone 2": "object",
        "Email": "object",
        "Subscription Date": "object",
        "Website": "object"
      },
      "sample_size": 10000,
      "numeric_columns": [
        "Index"
      ],
      "text_columns": [
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ]
    },
    "created_at": "2025-05-09T08:49:02.475996Z",
    "row_count": 10000
  },
  {
    "filename": "3f4e2856-e38d-45cb-806d-cedae52dff8f.csv",
    "file_type": "csv",
    "file_id": 11,
    "original_filename": "customers-10000.csv",
    "project_id": 1,
    "columns": {
      "names": [
        "Index",
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ],
      "types": {
        "Index": "int64",
        "Customer Id": "object",
        "First Name": "object",
        "Last Name": "object",
        "Company": "object",
        "City": "object",
        "Country": "object",
        "Phone 1": "object",
        "Phone 2": "object",
        "Email": "object",
        "Subscription Date": "object",
        "Website": "object"
      },
      "sample_size": 10000,
      "numeric_columns": [
        "Index"
      ],
      "text_columns": [
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ]
    },
    "created_at": "2025-05-09T09:06:08.526119Z",
    "row_count": 10000
  },
  {
    "filename": "c7100000-bd10-4962-ba51-e5edc1983adc.csv",
    "file_type": "csv",
    "file_id": 12,
    "original_filename": "customers-10000.csv",
    "project_id": 1,
    "columns": {
      "names": [
        "Index",
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ],
      "types": {
        "Index": "int64",
        "Customer Id": "object",
        "First Name": "object",
        "Last Name": "object",
        "Company": "object",
        "City": "object",
        "Country": "object",
        "Phone 1": "object",
        "Phone 2": "object",
        "Email": "object",
        "Subscription Date": "object",
        "Website": "object"
      },
      "sample_size": 10000,
      "numeric_columns": [
        "Index"
      ],
      "text_columns": [
        "Customer Id",
        "First Name",
        "Last Name",
        "Company",
        "City",
        "Country",
        "Phone 1",
        "Phone 2",
        "Email",
        "Subscription Date",
        "Website"
      ]
    },
    "created_at": "2025-06-06T06:44:14.128976Z",
    "row_count": 10000
  },
  {
    "filename": "792aa34f-a476-4181-b3e4-bc53a1ac1d92.csv",
    "file_type": "csv",
    "file_id": 13,
    "original_filename": "people-100.csv",
    "project_id": 1,
    "columns": {
      "names": [
        "Index",
        "User Id",
        "First Name",
        "Last Name",
        "Sex",
        "Email",
        "Phone",
        "Date of birth",
        "Job Title"
      ],
      "types": {
        "Index": "int64",
        "User Id": "object",
        "First Name": "object",
        "Last Name": "object",
        "Sex": "object",
        "Email": "object",
        "Phone": "object",
        "Date of birth": "object",
        "Job Title": "object"
      },
      "sample_size": 100,
      "numeric_columns": [
        "Index"
      ],
      "text_columns": [
        "User Id",
        "First Name",
        "Last Name",
        "Sex",
        "Email",
        "Phone",
        "Date of birth",
        "Job Title"
      ]
    },
    "created_at": "2025-06-06T07:20:07.626942Z",
    "row_count": 100
  }
]



curl -X 'GET' \
  'http://localhost:8000/api/visualizations/file/13?method=umap&dimensions=2' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer asdasd'


Output: [
  {
    "method": "umap",
    "dimensions": 2,
    "visualization_id": 480631,
    "embedding_id": 160233,
    "file_id": 13,
    "row_id": 100104,
    "coordinates": [
      -2.543278217315674,
      -2.209909439086914
    ],
    "clusters": 3,
    "created_at": "2025-06-06T07:20:25.678669Z"
  }]

  Currently i do not have any way to see if the file_id have already been processed, hence need a UI to try to go to the api visualisation and handle it to route to processing if the above failed using 

  curl -X 'POST' \
  'http://localhost:8000/api/embeddings/2/generate?column=Age&model_name=openai-text-embedding-ada-002' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer asdasd' \
  -d ''

  Output: 
  {
  "job_id": "06260ea1-db2d-44b4-bfb6-4d8d63e74fdd"
}


curl -X 'GET' \
  'http://localhost:8000/api/visualizations/file/1/check' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer asdasd'


  Output: {
  "file_id": 1,
  "file_name": "d0f36323-3502-4930-86ab-dc2c12028672.csv",
  "original_filename": "people-100.csv",
  "project_id": 1,
  "columns": {
    "names": [
      "Index",
      "User Id",
      "First Name",
      "Last Name",
      "Sex",
      "Email",
      "Phone",
      "Date of birth",
      "Job Title"
    ],
    "types": {
      "Index": "int64",
      "User Id": "object",
      "First Name": "object",
      "Last Name": "object",
      "Sex": "object",
      "Email": "object",
      "Phone": "object",
      "Date of birth": "object",
      "Job Title": "object"
    },
    "sample_size": 100,
    "numeric_columns": [
      "Index"
    ],
    "text_columns": [
      "User Id",
      "First Name",
      "Last Name",
      "Sex",
      "Email",
      "Phone",
      "Date of birth",
      "Job Title"
    ]
  },
  "created_at": "2025-05-02T08:03:55.995992Z",
  "row_count": 100,
  "has_visualizations": true,
  "available_methods": [
    "pca",
    "umap"
  ],
  "available_dimensions": [
    2,
    3
  ],
  "visualization_count": 600
}
