using System.Text;
using System.Globalization;

namespace DraftEngine.Services
{
    public static class StringNormalizationUtils
    {
        /// <summary>
        /// Compares two strings for equality, ignoring diacritics and case
        /// </summary>
        /// <param name="str1">First string to compare</param>
        /// <param name="str2">Second string to compare</param>
        /// <returns>True if the strings match, ignoring diacritics and case</returns>
        public static bool NormalizedEquals(string str1, string str2)
        {
            if (str1 == null && str2 == null) return true;
            if (str1 == null || str2 == null) return false;

            // Normalize both strings to decomposed form (diacritics separated)
            var normalized1 = str1.Normalize(NormalizationForm.FormD);
            var normalized2 = str2.Normalize(NormalizationForm.FormD);

            // Remove diacritics and convert to uppercase for comparison
            var sb1 = new StringBuilder();
            var sb2 = new StringBuilder();

            foreach (char c in normalized1)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                {
                    sb1.Append(c);
                }
            }

            foreach (char c in normalized2)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
                {
                    sb2.Append(c);
                }
            }

            return string.Equals(
                sb1.ToString(), 
                sb2.ToString(), 
                StringComparison.OrdinalIgnoreCase
            );
        }
    }
}
