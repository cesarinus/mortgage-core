import { describe, expect, it } from "vitest";
import { runCaseCalculation } from "../engine/runCalculation";
import type { CaseInputs } from "../engine/types";

describe("Income Analysis engine", () => {
  it("computes a Schedule C sole-proprietor subtotal verbatim from the worksheet", () => {
    // SAM formula at I30:
    //   =IFERROR(I19 + -I20 + SUM(I21:I22) - I23 + I24 + IF(ISNUMBER(I27),I27,0) + I28, 0)
    // With:
    //   net profit = 100000, nonrecurring = 2000, depletion = 0, depreciation = 12000,
    //   meals excl = 500, home use = 3000, miles = 10000 (× 0.33 = 3300), amort = 800
    // Subtotal = 100000 - 2000 + 12000 - 500 + 3000 + 3300 + 800 = 116,600
    const inputs: CaseInputs = {
      case_id: "test-case",
      tax_years: { year_1: 2025, year_2: 2024 },
      personal_lines: [],
      businesses: [
        {
          business_id: "biz-1",
          business_name: "Acme Consulting",
          entity: "sole_prop",
          ownership_pct: null,
          lines: [
            { line_number: "4",  year_1: 100000, year_2: 90000 },
            { line_number: "5",  year_1: 2000,   year_2: 1500 },
            { line_number: "6",  year_1: 0,      year_2: 0 },
            { line_number: "7",  year_1: 12000,  year_2: 11000 },
            { line_number: "8",  year_1: 500,    year_2: 400 },
            { line_number: "9",  year_1: 3000,   year_2: 3000 },
            { line_number: "10", year_1: 10000,  year_2: 9000 },
            { line_number: "12", year_1: 800,    year_2: 0 },
          ],
        },
      ],
    };

    const result = runCaseCalculation(inputs);
    const schC = result.sections.find((s) => s.section_code === "sch_c");
    expect(schC).toBeDefined();
    expect(schC!.year_1_subtotal).toBe(116600);
  });

  it("applies ownership percentage on partnership blocks", () => {
    // 1065 SUBTOTAL = -line29 + SUM(line30..line33) - line34 - line35
    // Final = SUBTOTAL × ownership_pct
    const inputs: CaseInputs = {
      case_id: "test-case-2",
      tax_years: { year_1: 2025, year_2: 2024 },
      businesses: [
        {
          business_id: "biz-llc",
          business_name: "Sample LLC",
          entity: "partnership",
          ownership_pct: 50,
          lines: [
            { line_number: "24", year_1: 80000, year_2: 70000 },
            { line_number: "25", year_1: 0,     year_2: 0 },
            { line_number: "26", year_1: 20000, year_2: 15000 },
            { line_number: "28", year_1: 0,     year_2: 0 },
            { line_number: "29", year_1: 5000,  year_2: 4000 },
            { line_number: "30", year_1: 8000,  year_2: 7000 },
            { line_number: "31", year_1: 2000,  year_2: 1500 },
            { line_number: "32", year_1: 1000,  year_2: 1000 },
            { line_number: "33", year_1: 0,     year_2: 0 },
            { line_number: "34", year_1: 1500,  year_2: 1000 },
            { line_number: "35", year_1: 500,   year_2: 200 },
          ],
        },
      ],
    };

    const result = runCaseCalculation(inputs);
    const partnership = result.sections.find((s) => s.section_code === "1065");
    expect(partnership).toBeDefined();
    // -5000 + (8000+2000+1000+0) - 1500 - 500 = 4000
    expect(partnership!.year_1_subtotal).toBe(4000);
    expect(partnership!.year_1_after_ownership).toBe(2000);
    expect(partnership!.ownership_pct).toBe(50);
  });

  it("produces a qualifying-income summary with annual + monthly averages", () => {
    const inputs: CaseInputs = {
      case_id: "test-case-3",
      tax_years: { year_1: 2025, year_2: 2024 },
      businesses: [
        {
          business_id: "biz-x",
          entity: "sole_prop",
          ownership_pct: null,
          lines: [{ line_number: "4", year_1: 60000, year_2: 48000 }],
        },
      ],
    };
    const summary = runCaseCalculation(inputs).summaries[0];
    expect(summary.year_1_income).toBe(60000);
    expect(summary.year_2_income).toBe(48000);
    expect(summary.average_annual_income).toBe(54000);
    expect(summary.average_monthly_income).toBe(4500);
    expect(summary.trend).toBe("increasing");
  });
});