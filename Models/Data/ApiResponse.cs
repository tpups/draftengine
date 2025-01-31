namespace DraftEngine.Models.Data
{
    public class ApiResponse<T>
    {
        public T Value { get; set; } = default!;
        public int Count { get; set; }

        public ApiResponse(T value, int count)
        {
            Value = value;
            Count = count;
        }

        public static ApiResponse<T> Create(T value)
        {
            var count = value switch
            {
                System.Collections.ICollection collection => collection.Count,
                System.Collections.IEnumerable enumerable => enumerable.Cast<object>().Count(),
                _ => 1
            };

            return new ApiResponse<T>(value, count);
        }
    }
}
