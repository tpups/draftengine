using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
using DraftEngine.Models.Data;

namespace DraftEngine.Swagger
{
    public class FileUploadOperation : IOperationFilter
    {
        public void Apply(OpenApiOperation operation, OperationFilterContext context)
        {
            var parameters = context.ApiDescription.ActionDescriptor.Parameters;
            foreach (var parameter in parameters)
            {
                if (parameter.ParameterType == typeof(CsvImportRequest))
                {
                    operation.RequestBody = new OpenApiRequestBody
                    {
                        Content = new Dictionary<string, OpenApiMediaType>
                        {
                            ["multipart/form-data"] = new OpenApiMediaType
                            {
                                Schema = new OpenApiSchema
                                {
                                    Type = "object",
                                    Properties = new Dictionary<string, OpenApiSchema>
                                    {
                                        ["file"] = new OpenApiSchema
                                        {
                                            Type = "string",
                                            Format = "binary"
                                        },
                                        ["dataSource"] = new OpenApiSchema
                                        {
                                            Type = "string"
                                        },
                                        ["dataType"] = new OpenApiSchema
                                        {
                                            Type = "string"
                                        },
                                        ["playerCount"] = new OpenApiSchema
                                        {
                                            Type = "integer",
                                            Format = "int32"
                                        }
                                    }
                                }
                            }
                        }
                    };
                    break;
                }
            }
        }
    }
}
