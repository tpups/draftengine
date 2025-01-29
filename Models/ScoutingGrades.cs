namespace DraftEngine
{
    public class ScoutingGrades
    {
        // Hitting grades
        public int? Hit { get; set; }
        public int? RawPower { get; set; }
        public int? GamePower { get; set; }
        public int? Run { get; set; }
        public int? Arm { get; set; }
        public int? Field { get; set; }

        // Pitching grades
        public int? Fastball { get; set; }
        public int? Slider { get; set; }
        public int? Curve { get; set; }
        public int? Changeup { get; set; }
        public int? Control { get; set; }
        public int? Command { get; set; }
    }
}
