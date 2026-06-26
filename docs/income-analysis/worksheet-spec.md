# Self-Employed Income Worksheet — Calculation Spec

Generated from `All-In-One-Worksheet-Macro-Free.xlsx` (Tax Year 2025). This is the single source of truth for the Mortgage Core Income Analysis engine — every formula, line reference, and lookup below is mirrored verbatim from the workbook.

## Sheets

- **SAM** — 444 rows × 16 cols, 142 formulas
- **Summary** — 67 rows × 17 cols, 233 formulas
- **Liquidity** — 223 rows × 14 cols, 176 formulas
- **Comparative** — 494 rows × 21 cols, 675 formulas
- **P&L** — 383 rows × 20 cols, 343 formulas
- **Help Document** — 468 rows × 46 cols, 0 formulas
- **Support** — 13 rows × 12 cols, 0 formulas

## Lookup tables (named ranges)

### `LKP_MILEAGE`

| col1 |
|---|

### `LKP_MONTH`

| col1 |
|---|

### `LKP_YEAR`

| col1 |
|---|

### `LKP_YEAR_1`

| col1 |
|---|

### `LKP_YEAR_2`

| col1 |
|---|

### `LKP_YEAR_3`

| col1 |
|---|

### `LKP_YEAR_LIQUIDITY`

| col1 |
|---|

## All defined names

- `ErrMsg_EnterAnnDate` → `Support!$L$5`
- `ErrMsg_InputTwoYears` → `Support!$L$6`
- `ErrMsg_InputYears` → `Support!$L$2`
- `LKP_MILEAGE` → `OFFSET(Support!$A$1,1,0,COUNTA(Support!$A:$A)-1,2)`
- `LKP_MONTH` → `OFFSET(Support!$C$1,1,0,COUNTA(Support!$C:$C)-1,1)`
- `LKP_YEAR` → `OFFSET(Support!$A$1,1,0,COUNTA(Support!$A:$A)-1,1)`
- `LKP_YEAR_1` → `OFFSET(Support!$D$1,1,0,COUNTA(Support!$D:$D)-1,1)`
- `LKP_YEAR_2` → `OFFSET(Support!$E$1,1,0,COUNTA(Support!$E:$E)-1,1)`
- `LKP_YEAR_3` → `OFFSET(Support!$F$1,1,0,COUNTA(Support!$F:$F)-1,1)`
- `LKP_YEAR_LIQUIDITY` → `OFFSET(Support!$J$1,1,0,COUNTA(Support!$J:$J)-1,1)`
- `Msg_DisplaySchedule` → `Support!$L$3`
- `Msg_HideSchedule` → `Support!$L$4`
- `YEAR_1` → `Support!$G$2`
- `YEAR_2` → `Support!$H$2`
- `YEAR_3` → `Support!$I$2`

## Sheet: SAM

### Detected sections

#### SCHEDULE B - INTEREST AND DIVIDENDS FROM SELF-EMPLOYMENT  (row 7)

| Line | Row | IRS / Label |
|---|---|---|
| 1 | 9 | Recurring Interest Income: LINE 1 or 1040 LINE 2b |
| 2 | 10 | Recurring Dividend Income: LINE 5 or 1040 LINE 3b |

#### SCHEDULE C - SOLE PROPRIETORSHIP  (row 15)

| Line | Row | IRS / Label |
|---|---|---|
| 4 | 19 | Net Profit (Loss): LINE 31 |
| 5 | 20 | Deduct nonrecurring income: LINE 6 |
| 6 | 21 | Depletion: LINE 12 |
| 7 | 22 | Depreciation: LINE 13 |
| 8 | 23 | Non-Deductible Meals and Entertainment Exclusion: LINE 24b |
| 9 | 24 | Business Use of Home: LINE 30 |
| 10 | 25 | Business Miles: Page 2, Part IV, LINE 44a OR Related 4562, Line 30 |
| 11a | 26 | x Depreciation Rate 2025: $0.33, 2024: $0.30, 2023: $0.28 |
| 11b | 27 | = Total Mileage Depreciation |
| 12 | 28 | Amortization/Casualty Loss (only if noted): page 2, part V |
| 4 | 34 | Net Profit (Loss): LINE 31 |
| 5 | 35 | Deduct nonrecurring income: LINE 6 |
| 6 | 36 | Depletion: LINE 12 |
| 7 | 37 | Depreciation: LINE 13 |
| 8 | 38 | Non-Deductible Meals and Entertainment Exclusion: LINE 24b |
| 9 | 39 | Business Use of Home: LINE 30 |
| 10 | 40 | Business Miles: Page 2, Part IV, LINE 44a OR Related 4562, Line 30 |
| 11a | 41 | x Depreciation Rate 2025: $0.33, 2024: $0.30, 2023: $0.28 |
| 11b | 42 | = Total Mileage Depreciation |
| 12 | 43 | Amortization/Casualty Loss (only if noted): page 2, part V |
| 4 | 49 | Net Profit (Loss): LINE 31 |
| 5 | 50 | Deduct nonrecurring income: LINE 6 |
| 6 | 51 | Depletion: LINE 12 |
| 7 | 52 | Depreciation: LINE 13 |
| 8 | 53 | Non-Deductible Meals and Entertainment Exclusion: LINE 24b |
| 9 | 54 | Business Use of Home: LINE 30 |
| 10 | 55 | Business Miles: Page 2, Part IV, LINE 44a OR Related 4562, Line 30 |
| 11a | 56 | x Depreciation Rate 2025: $0.33, 2024: $0.30, 2023: $0.28 |
| 11b | 57 | = Total Mileage Depreciation |
| 12 | 58 | Amortization/Casualty Loss (only if noted): page 2, part V |

#### SCHEDULE C - SINGLE-MEMBER LLC  (row 63)

| Line | Row | IRS / Label |
|---|---|---|
| 3 | 67 | W-2 Income from Self-Employment: W-2, Box 5 (in general) |
| 4 | 68 | Net Profit (Loss): LINE 31 |
| 5 | 69 | Deduct nonrecurring income: LINE 6 |
| 6 | 70 | Depletion: LINE 12 |
| 7 | 71 | Depreciation: LINE 13 |
| 8 | 72 | Non-Deductible Meals and Entertainment Exclusion: LINE 24b |
| 9 | 73 | Business Use of Home: LINE 30 |
| 10 | 74 | Business Miles: Page 2, Part IV, LINE 44a OR Related 4562, Line 30 |
| 11a | 75 | x Depreciation Rate 2025: $0.33, 2024: $0.30, 2023: $0.28 |
| 11b | 76 | = Total Mileage Depreciation |
| 12 | 77 | Amortization/Casualty Loss (only if noted): page 2, part V |

#### SCHEDULE D - CAPITAL GAINS AND LOSSES  (row 82)

| Line | Row | IRS / Label |
|---|---|---|
| 13 | 84 | Recurring Capital Gains (Loss): page 2, LINE 16 (details on FORM 8949) |

#### SCHEDULE E - SUPPLEMENTAL INCOME AND LOSS  (row 89)

| Line | Row | IRS / Label |
|---|---|---|
| 14 | 91 | Royalty Income (Loss): LINE 4 |
| 15 | 92 | Total Expenses: LINE 20 |
| 16 | 93 | Depreciation Expense or Depletion: LINE 18 |

#### SCHEDULE F - FARM INCOME  (row 98)

| Line | Row | IRS / Label |
|---|---|---|
| 17 | 100 | Net Profit (Loss): LINE 34 |
| 18 | 101 | Non-Tax Portion Ongoing Co-op & CCC Pmts: LINES 3a minus b through 6a minus b |
| 19 | 102 | Add nonrecurring loss: LINE 2-8  |
| 20 | 103 | Deduct nonrecurring income: LINE 2-8  |
| 21 | 104 | Depreciation: LINE 14  |
| 22 | 105 | Amortization/Casualty Loss/Depletion (only if noted): LINE 32 |
| 23 | 106 | Business Use of Home (only if noted): LINE 32 |

#### Partnership Cash Flow  (row 111)

#### PARTNERSHIP                                                                 Name:  (row 113)

| Line | Row | IRS / Label |
|---|---|---|
| 24 | 117 | Ordinary Income (Loss): LINE 1  If > Distributions see additional requirements. |
| 25 | 118 | Net Rental Income (Loss): LINES 2 & 3  If > Distributions see additional requirements. |
| 26 | 119 | Guaranteed Payments: LINE 4c |
| 27 | 125 | Wages: W-2, Box 5 (in general) |

#### FORM 1065  (row 127)

| Line | Row | IRS / Label |
|---|---|---|
| 28 | 129 | Passthrough (Income) Loss from Other Partnerships: LINE 4  |
| 29 | 130 | Deduct nonrecurring income: LINES 5, 6 & 7 |
| 30 | 131 | Depreciation: LINE 16c |
| 31 | 132 | Depreciation (FORM 8825): LINE 14 |
| 32 | 133 | Depletion: LINE 17 |
| 33 | 134 | Amortization/Casualty Loss/Nonrecurring Loss: from statement or LINES 5,6 & 7 |
| 34 | 135 | Mortgages or Notes Payable in Less Than 1 Year: Schedule L, LINE 16, Column d |
| 35 | 136 | Non-Deductible Travel and Entertainment Exclusion: Schedule M-1, LINE 4b |
| 36 | 140 | Multiplied by Ownership Percentage |

#### PARTNERSHIP                                                                 Name:  (row 145)

| Line | Row | IRS / Label |
|---|---|---|
| 24 | 149 | Ordinary Income (Loss): LINE 1  If > Distributions see additional requirements. |
| 25 | 150 | Net Rental Income (Loss): LINES 2 & 3  If > Distributions see additional requirements. |
| 26 | 151 | Guaranteed Payments: LINE 4c |
| 27 | 157 | Wages: W-2, Box 5 (in general) |

#### FORM 1065  (row 159)

| Line | Row | IRS / Label |
|---|---|---|
| 28 | 161 | Passthrough (Income) Loss from Other Partnerships: LINE 4  |
| 29 | 162 | Deduct nonrecurring income: LINES 5, 6 & 7 |
| 30 | 163 | Depreciation: LINE 16c |
| 31 | 164 | Depreciation (FORM 8825): LINE 14 |
| 32 | 165 | Depletion: LINE 17 |
| 33 | 166 | Amortization/Casualty Loss/Nonrecurring Loss: from statement or LINES 5,6 & 7 |
| 34 | 167 | Mortgages or Notes Payable in Less Than 1 Year: Schedule L, LINE 16, Column d |
| 35 | 168 | Non-Deductible Travel and Entertainment Exclusion: Schedule M-1, LINE 4b |
| 36 | 172 | Multiplied by Ownership Percentage |

#### PARTNERSHIP                                                                 Name:  (row 177)

| Line | Row | IRS / Label |
|---|---|---|
| 24 | 181 | Ordinary Income (Loss): LINE 1  If > Distributions see additional requirements. |
| 25 | 182 | Net Rental Income (Loss): LINES 2 & 3  If > Distributions see additional requirements. |
| 26 | 183 | Guaranteed Payments: LINE 4c |
| 27 | 189 | Wages: W-2, Box 5 (in general) |

#### FORM 1065  (row 191)

| Line | Row | IRS / Label |
|---|---|---|
| 28 | 193 | Passthrough (Income) Loss from Other Partnerships: LINE 4  |
| 29 | 194 | Deduct nonrecurring income: LINES 5, 6 & 7 |
| 30 | 195 | Depreciation: LINE 16c |
| 31 | 196 | Depreciation (FORM 8825): LINE 14 |
| 32 | 197 | Depletion: LINE 17 |
| 33 | 198 | Amortization/Casualty Loss/Nonrecurring Loss: from statement or LINES 5,6 & 7 |
| 34 | 199 | Mortgages or Notes Payable in Less Than 1 Year: Schedule L, LINE 16, Column d |
| 35 | 200 | Non-Deductible Travel and Entertainment Exclusion: Schedule M-1, LINE 4b |
| 36 | 204 | Multiplied by Ownership Percentage |

#### PARTNERSHIP                                                                 Name:  (row 209)

| Line | Row | IRS / Label |
|---|---|---|
| 24 | 213 | Ordinary Income (Loss): LINE 1  If > Distributions see additional requirements. |
| 25 | 214 | Net Rental Income (Loss): LINES 2 & 3  If > Distributions see additional requirements. |
| 26 | 215 | Guaranteed Payments: LINE 4c |
| 27 | 221 | Wages: W-2, Box 5 (in general) |

#### FORM 1065  (row 223)

| Line | Row | IRS / Label |
|---|---|---|
| 28 | 225 | Passthrough (Income) Loss from Other Partnerships: LINE 4  |
| 29 | 226 | Deduct nonrecurring income: LINES 5, 6 & 7 |
| 30 | 227 | Depreciation: LINE 16c |
| 31 | 228 | Depreciation (FORM 8825): LINE 14 |
| 32 | 229 | Depletion: LINE 17 |
| 33 | 230 | Amortization/Casualty Loss/Nonrecurring Loss: from statement or LINES 5,6 & 7 |
| 34 | 231 | Mortgages or Notes Payable in Less Than 1 Year: Schedule L, LINE 16, Column d |
| 35 | 232 | Non-Deductible Travel and Entertainment Exclusion: Schedule M-1, LINE 4b |
| 36 | 236 | Multiplied by Ownership Percentage |

#### S Corporation Cash Flow  (row 241)

#### S CORPORATION                                                            Name:  (row 243)

| Line | Row | IRS / Label |
|---|---|---|
| 37 | 247 | Ordinary Income (Loss): LINE 1  If > Distributions see additional requirements. |
| 38 | 248 | Net Rental Income (Loss): LINES 2 & 3  If > Distributions see additional requirements. |
| 39 | 254 | Wages: W-2, Box 5 (in general) |

#### FORM 1120S  (row 256)

| Line | Row | IRS / Label |
|---|---|---|
| 40 | 258 | Deduct nonrecurring income: LINES 4 & 5 |
| 41 | 259 | Depreciation: LINE 14 |
| 42 | 260 | Depreciation (FORM 8825): LINE 14 |
| 43 | 261 | Depletion: LINE 15 |
| 44 | 262 | Amortization/Casualty Loss/Nonrecurring Loss: from statement or LINES 4 & 5 |
| 45 | 263 | Mortgages or Notes Payable in Less Than 1 Year: Schedule L, LINE 17, Column d |
| 46 | 264 | Non-Deductible Travel and Entertainment Exclusion: Schedule M-1, LINE 3b |
| 47 | 268 | Multiplied by Ownership Percentage |

#### S CORPORATION                                                            Name:  (row 273)

| Line | Row | IRS / Label |
|---|---|---|
| 37 | 277 | Ordinary Income (Loss): LINE 1  If > Distributions see additional requirements. |
| 38 | 278 | Net Rental Income (Loss): LINES 2 & 3  If > Distributions see additional requirements. |
| 39 | 284 | Wages: W-2, Box 5 (in general) |

#### FORM 1120S  (row 286)

| Line | Row | IRS / Label |
|---|---|---|
| 40 | 288 | Deduct nonrecurring income: LINES 4 & 5 |
| 41 | 289 | Depreciation: LINE 14 |
| 42 | 290 | Depreciation (FORM 8825): LINE 14 |
| 43 | 291 | Depletion: LINE 15 |
| 44 | 292 | Amortization/Casualty Loss/Nonrecurring Loss: from statement or LINES 4 & 5 |
| 45 | 293 | Mortgages or Notes Payable in Less Than 1 Year: Schedule L, LINE 17, Column d |
| 46 | 294 | Non-Deductible Travel and Entertainment Exclusion: Schedule M-1, LINE 3b |
| 47 | 298 | Multiplied by Ownership Percentage |

#### S CORPORATION                                                            Name:  (row 303)

| Line | Row | IRS / Label |
|---|---|---|
| 37 | 307 | Ordinary Income (Loss): LINE 1  If > Distributions see additional requirements. |
| 38 | 308 | Net Rental Income (Loss): LINES 2 & 3  If > Distributions see additional requirements. |
| 39 | 314 | Wages: W-2, Box 5 (in general) |

#### FORM 1120S  (row 316)

| Line | Row | IRS / Label |
|---|---|---|
| 40 | 318 | Deduct nonrecurring income: LINES 4 & 5 |
| 41 | 319 | Depreciation: LINE 14 |
| 42 | 320 | Depreciation (FORM 8825): LINE 14 |
| 43 | 321 | Depletion: LINE 15 |
| 44 | 322 | Amortization/Casualty Loss/Nonrecurring Loss: from statement or LINES 4 & 5 |
| 45 | 323 | Mortgages or Notes Payable in Less Than 1 Year: Schedule L, LINE 17, Column d |
| 46 | 324 | Non-Deductible Travel and Entertainment Exclusion: Schedule M-1, LINE 3b |
| 47 | 328 | Multiplied by Ownership Percentage |

#### S CORPORATION                                                            Name:  (row 333)

| Line | Row | IRS / Label |
|---|---|---|
| 37 | 337 | Ordinary Income (Loss): LINE 1  If > Distributions see additional requirements. |
| 38 | 338 | Net Rental Income (Loss): LINES 2 & 3  If > Distributions see additional requirements. |
| 39 | 344 | Wages: W-2, Box 5 (in general) |

#### FORM 1120S  (row 346)

| Line | Row | IRS / Label |
|---|---|---|
| 40 | 348 | Deduct nonrecurring income: LINES 4 & 5 |
| 41 | 349 | Depreciation: LINE 14 |
| 42 | 350 | Depreciation (FORM 8825): LINE 14 |
| 43 | 351 | Depletion: LINE 15 |
| 44 | 352 | Amortization/Casualty Loss/Nonrecurring Loss: from statement or LINES 4 & 5 |
| 45 | 353 | Mortgages or Notes Payable in Less Than 1 Year: Schedule L, LINE 17, Column d |
| 46 | 354 | Non-Deductible Travel and Entertainment Exclusion: Schedule M-1, LINE 3b |
| 47 | 358 | Multiplied by Ownership Percentage |

#### Corporation Cash Flow  (row 363)

#### CORPORATION                                                               Name:  (row 365)

| Line | Row | IRS / Label |
|---|---|---|
| 48 | 369 | Wages: W-2, Box 5 (in general) |

#### FORM 1120  (row 371)

| Line | Row | IRS / Label |
|---|---|---|
| 49 | 373 | Taxable Income: LINE 30 |
| 50 | 374 | Total Tax: LINE 31 |
| 51 | 375 | Deduct nonrecurring gains/add nonrecurring losses: LINES 8 & 9 |
| 52 | 376 | Deduct nonrecurring income: LINE 10 |
| 53 | 377 | Depreciation: LINE 20 |
| 54 | 378 | Depletion: LINE 21 |
| 55 | 379 | Amortization/Casualty Loss/Nonrecurring Loss: from statement or LINES 8 & 9 |
| 56 | 380 | Net Operating Loss and Special Deductions: LINES 29a & b |
| 57 | 381 | Mortgages or Notes Payable in Less Than 1 Year: Schedule L, LINE 17, Column d |
| 58 | 382 | Non-Deductible Travel and Entertainment Exclusion: Schedule M-1, LINE 5c |
| 59 | 386 | Multiplied by Ownership Percentage |
| 60 | 387 | Dividends Paid to Borrower: Form 1040, Schedule B, LINE 5 |

#### Corporation’s Total Share of Income (Loss)  (row 389)

#### CORPORATION                                                               Name:  (row 392)

| Line | Row | IRS / Label |
|---|---|---|
| 48 | 396 | Wages: W-2, Box 5 (in general) |

#### FORM 1120  (row 398)

| Line | Row | IRS / Label |
|---|---|---|
| 49 | 400 | Taxable Income: LINE 30 |
| 50 | 401 | Total Tax: LINE 31 |
| 51 | 402 | Deduct nonrecurring gains/add nonrecurring losses: LINES 8 & 9 |
| 52 | 403 | Deduct nonrecurring income: LINE 10 |
| 53 | 404 | Depreciation: LINE 20 |
| 54 | 405 | Depletion: LINE 21 |
| 55 | 406 | Amortization/Casualty Loss/Nonrecurring Loss: from statement or LINES 8 & 9 |
| 56 | 407 | Net Operating Loss and Special Deductions: LINES 29a & b |
| 57 | 408 | Mortgages or Notes Payable in Less Than 1 Year: Schedule L, LINE 17, Column d |
| 58 | 409 | Non-Deductible Travel and Entertainment Exclusion: Schedule M-1, LINE 5c |
| 59 | 413 | Multiplied by Ownership Percentage |
| 60 | 414 | Dividends Paid to Borrower: Form 1040, Schedule B, LINE 5 |

#### Corporation’s Total Share of Income (Loss)  (row 416)

#### CORPORATION                                                               Name:  (row 419)

| Line | Row | IRS / Label |
|---|---|---|
| 48 | 423 | Wages: W-2, Box 5 (in general) |

#### FORM 1120  (row 425)

| Line | Row | IRS / Label |
|---|---|---|
| 49 | 427 | Taxable Income: LINE 30 |
| 50 | 428 | Total Tax: LINE 31 |
| 51 | 429 | Deduct nonrecurring gains/add nonrecurring losses: LINES 8 & 9 |
| 52 | 430 | Deduct nonrecurring income: LINE 10 |
| 53 | 431 | Depreciation: LINE 20 |
| 54 | 432 | Depletion: LINE 21 |
| 55 | 433 | Amortization/Casualty Loss/Nonrecurring Loss: from statement or LINES 8 & 9 |
| 56 | 434 | Net Operating Loss and Special Deductions: LINES 29a & b |
| 57 | 435 | Mortgages or Notes Payable in Less Than 1 Year: Schedule L, LINE 17, Column d |
| 58 | 436 | Non-Deductible Travel and Entertainment Exclusion: Schedule M-1, LINE 5c |
| 59 | 440 | Multiplied by Ownership Percentage |
| 60 | 441 | Dividends Paid to Borrower: Form 1040, Schedule B, LINE 5 |

#### Corporation’s Total Share of Income (Loss)  (row 443)

### Formulas (142)

| Coord | Formula | Cached value |
|---|---|---|
| I7 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L7 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| I12 | `=SUM(I9:I10)` | 0 |
| L12 | `=SUM(L9:L10)` | 0 |
| I15 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L15 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| I17 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L17 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| P25 | `=IF(OR(AND(NOT(ISBLANK(I25)),ISBLANK($I$5)),AND(NOT(ISBLANK(L25)),ISBLANK($L$5))),ErrMsg_InputYears,"")` |  |
| I26 | `=IFERROR(IF(AND(I25>0,$I$5>0),VLOOKUP($I$5,LKP_MILEAGE,2,FALSE),""),"")` |  |
| L26 | `=IFERROR(IF(AND(L25>0,$L$5>0),VLOOKUP($L$5,LKP_MILEAGE,2,FALSE),""),"")` |  |
| C27 | `= Total Mileage Depreciation` | = Total Mileage Depreciation |
| I27 | `=IFERROR(IF(I26>0,I25*I26,""),"")` |  |
| L27 | `=IFERROR(IF(L26>0,L25*L26,""),"")` |  |
| I30 | `=IFERROR(I19+-I20+SUM(I21:I22)-I23+I24+IF(ISNUMBER(I27),I27,0)+I28,0)` | 0 |
| L30 | `=IFERROR(L19+-L20+SUM(L21:L22)-L23+L24+IF(ISNUMBER(L27),L27,0)+L28,0)` | 0 |
| I32 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L32 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| P40 | `=IF(OR(AND(NOT(ISBLANK(I40)),ISBLANK($I$5)),AND(NOT(ISBLANK(L40)),ISBLANK($L$5))),ErrMsg_InputYears,"")` |  |
| I41 | `=IFERROR(IF(AND(I40>0,$I$5>0),VLOOKUP($I$5,LKP_MILEAGE,2,FALSE),""),"")` |  |
| L41 | `=IFERROR(IF(AND(L40>0,$L$5>0),VLOOKUP($L$5,LKP_MILEAGE,2,FALSE),""),"")` |  |
| C42 | `= Total Mileage Depreciation` | = Total Mileage Depreciation |
| I42 | `=IFERROR(IF(I41>0,I40*I41,""),"")` |  |
| L42 | `=IFERROR(IF(L41>0,L40*L41,""),"")` |  |
| I45 | `=IFERROR(I34+-I35+SUM(I36:I37)-I38+I39+IF(ISNUMBER(I42),I42,0)+I43,0)` | 0 |
| L45 | `=IFERROR(L34+-L35+SUM(L36:L37)-L38+L39+IF(ISNUMBER(L42),L42,0)+L43,0)` | 0 |
| I47 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L47 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| P55 | `=IF(OR(AND(NOT(ISBLANK(I55)),ISBLANK($I$5)),AND(NOT(ISBLANK(L55)),ISBLANK($L$5))),ErrMsg_InputYears,"")` |  |
| I56 | `=IFERROR(IF(AND(I55>0,$I$5>0),VLOOKUP($I$5,LKP_MILEAGE,2,FALSE),""),"")` |  |
| L56 | `=IFERROR(IF(AND(L55>0,$L$5>0),VLOOKUP($L$5,LKP_MILEAGE,2,FALSE),""),"")` |  |
| C57 | `= Total Mileage Depreciation` | = Total Mileage Depreciation |
| I57 | `=IFERROR(IF(I56>0,I55*I56,""),"")` |  |
| L57 | `=IFERROR(IF(L56>0,L55*L56,""),"")` |  |
| I60 | `=IFERROR(I49+-I50+SUM(I51:I52)-I53+I54+IF(ISNUMBER(I57),I57,0)+I58,0)` | 0 |
| L60 | `=IFERROR(L49+-L50+SUM(L51:L52)-L53+L54+IF(ISNUMBER(L57),L57,0)+L58,0)` | 0 |
| I63 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L63 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| I65 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L65 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| P74 | `=IF(OR(AND(NOT(ISBLANK(I74)),ISBLANK($I$5)),AND(NOT(ISBLANK(L74)),ISBLANK($L$5))),ErrMsg_InputYears,"")` |  |
| I75 | `=IFERROR(IF(AND(I74>0,$I$5>0),VLOOKUP($I$5,LKP_MILEAGE,2,FALSE),""),"")` |  |
| L75 | `=IFERROR(IF(AND(L74>0,$L$5>0),VLOOKUP($L$5,LKP_MILEAGE,2,FALSE),""),"")` |  |
| C76 | `= Total Mileage Depreciation` | = Total Mileage Depreciation |
| I76 | `=IFERROR(IF(I75>0,I74*I75,""),"")` |  |
| L76 | `=IFERROR(IF(L75>0,L74*L75,""),"")` |  |
| I79 | `=IFERROR(SUM(I67:I68)-I69+SUM(I70:I71)-I72+I73+IF(ISNUMBER(I76),I76,0)+I77,0)` | 0 |
| L79 | `=IFERROR(SUM(L67:L68)-L69+SUM(L70:L71)-L72+L73+IF(ISNUMBER(L76),L76,0)+L77,0)` | 0 |
| I82 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L82 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| I86 | `=SUM(I84:I84)` | 0 |
| L86 | `=SUM(L84:L84)` | 0 |
| I89 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L89 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| I95 | `=I91-I92+I93` | 0 |
| L95 | `=L91-L92+L93` | 0 |
| I98 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L98 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| I108 | `=SUM(I100:I102)-I103+SUM(I104:I106)` | 0 |
| L108 | `=SUM(L100:L102)-L103+SUM(L104:L106)` | 0 |
| I113 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L113 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| I121 | `=IFERROR(SUM(I117:I119),0)` | 0 |
| L121 | `=IFERROR(SUM(L117:L119),0)` | 0 |
| I138 | `=IFERROR(I129-I130+SUM(I131:I134)-I135-I136,0)` | 0 |
| L138 | `=IFERROR(L129-L130+SUM(L131:L134)-L135-L136,0)` | 0 |
| I142 | `=IFERROR(I138*I140,0)` | 0 |
| L142 | `=IFERROR(L138*L140,0)` | 0 |
| I145 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L145 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| I153 | `=IFERROR(SUM(I149:I151),0)` | 0 |
| L153 | `=IFERROR(SUM(L149:L151),0)` | 0 |
| I170 | `=IFERROR(I161-I162+SUM(I163:I166)-I167-I168,0)` | 0 |
| L170 | `=IFERROR(L161-L162+SUM(L163:L166)-L167-L168,0)` | 0 |
| I174 | `=IFERROR(I170*I172,0)` | 0 |
| L174 | `=IFERROR(L170*L172,0)` | 0 |
| I177 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L177 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| I185 | `=IFERROR(SUM(I181:I183),0)` | 0 |
| L185 | `=IFERROR(SUM(L181:L183),0)` | 0 |
| I202 | `=IFERROR(I193-I194+SUM(I195:I198)-I199-I200,0)` | 0 |
| L202 | `=IFERROR(L193-L194+SUM(L195:L198)-L199-L200,0)` | 0 |
| I206 | `=IFERROR(I202*I204,0)` | 0 |
| L206 | `=IFERROR(L202*L204,0)` | 0 |
| I209 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L209 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| I217 | `=IFERROR(SUM(I213:I215),0)` | 0 |
| L217 | `=IFERROR(SUM(L213:L215),0)` | 0 |
| I234 | `=IFERROR(I225-I226+SUM(I227:I230)-I231-I232,0)` | 0 |
| L234 | `=IFERROR(L225-L226+SUM(L227:L230)-L231-L232,0)` | 0 |
| I238 | `=IFERROR(I234*I236,0)` | 0 |
| L238 | `=IFERROR(L234*L236,0)` | 0 |
| I243 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L243 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| I250 | `=IFERROR(SUM(I247:I248),0)` | 0 |
| L250 | `=IFERROR(SUM(L247:L248),0)` | 0 |
| I266 | `=IFERROR(-I258+SUM(I259:I262)-I263-I264,0)` | 0 |
| L266 | `=IFERROR(-L258+SUM(L259:L262)-L263-L264,0)` | 0 |
| I270 | `=IFERROR(I266*I268,0)` | 0 |
| L270 | `=IFERROR(L266*L268,0)` | 0 |
| I273 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L273 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| I280 | `=IFERROR(SUM(I277:I278),0)` | 0 |
| L280 | `=IFERROR(SUM(L277:L278),0)` | 0 |
| I296 | `=IFERROR(-I288+SUM(I289:I292)-I293-I294,0)` | 0 |
| L296 | `=IFERROR(-L288+SUM(L289:L292)-L293-L294,0)` | 0 |
| I300 | `=IFERROR(I296*I298,0)` | 0 |
| L300 | `=IFERROR(L296*L298,0)` | 0 |
| I303 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L303 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| I310 | `=IFERROR(SUM(I307:I308),0)` | 0 |
| L310 | `=IFERROR(SUM(L307:L308),0)` | 0 |
| I326 | `=IFERROR(-I318+SUM(I319:I322)-I323-I324,0)` | 0 |
| L326 | `=IFERROR(-L318+SUM(L319:L322)-L323-L324,0)` | 0 |
| I330 | `=IFERROR(I326*I328,0)` | 0 |
| L330 | `=IFERROR(L326*L328,0)` | 0 |
| I333 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L333 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| I340 | `=IFERROR(SUM(I337:I338),0)` | 0 |
| L340 | `=IFERROR(SUM(L337:L338),0)` | 0 |
| I356 | `=IFERROR(-I348+SUM(I349:I352)-I353-I354,0)` | 0 |
| L356 | `=IFERROR(-L348+SUM(L349:L352)-L353-L354,0)` | 0 |
| I360 | `=IFERROR(I356*I358,0)` | 0 |
| L360 | `=IFERROR(L356*L358,0)` | 0 |
| I365 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L365 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| I384 | `=IFERROR(I373-I374+I375-I376+SUM(I377:I380)-I381-I382,0)` | 0 |
| L384 | `=IFERROR(L373-L374+L375-L376+SUM(L377:L380)-L381-L382,0)` | 0 |
| I389 | `=IFERROR((I384*I386)-I387,0)` | 0 |
| L389 | `=IFERROR((L384*L386)-L387,0)` | 0 |
| I392 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L392 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| I411 | `=IFERROR(I400-I401+I402-I403+SUM(I404:I407)-I408-I409,0)` | 0 |
| L411 | `=IFERROR(L400-L401+L402-L403+SUM(L404:L407)-L408-L409,0)` | 0 |
| I416 | `=IFERROR((I411*I413)-I414,0)` | 0 |
| L416 | `=IFERROR((L411*L413)-L414,0)` | 0 |
| I419 | `=IF(ISNUMBER($I$5),$I$5,"")` |  |
| L419 | `=IF(ISNUMBER($L$5),$L$5,"")` |  |
| I438 | `=IFERROR(I427-I428+I429-I430+SUM(I431:I434)-I435-I436,0)` | 0 |
| L438 | `=IFERROR(L427-L428+L429-L430+SUM(L431:L434)-L435-L436,0)` | 0 |
| I443 | `=IFERROR((I438*I440)-I441,0)` | 0 |
| L443 | `=IFERROR((L438*L440)-L441,0)` | 0 |

## Sheet: Summary

### Detected sections

#### Schedule B  (row 7)

#### Schedule D  (row 12)

#### Schedule E  (row 13)

#### Schedule F  (row 14)

#### PARTNERSHIP & S CORPORATION CASH FLOW SUBTOTALS:  (row 15)

#### CORPORATION CASH FLOW SUBTOTALS:  (row 48)

### Formulas (233)

| Coord | Formula | Cached value |
|---|---|---|
| E5 | `=IF(ISNUMBER(SAM!I5),SAM!I5,"")` |  |
| I5 | `=IF(ISNUMBER(SAM!L5),SAM!L5,"")` |  |
| E7 | `=SAM!I12` | 0 |
| I7 | `=SAM!L12` | 0 |
| K7 | `=IFERROR((IF(P7,0,E7)+IF(Q7,0,I7))/M7,0)` | 0 |
| M7 | `=IF(P7,0,F7)+IF(Q7,0,J7)` | 24 |
| C8 | `="Schedule C   "&SAM!D17` | Schedule C    |
| E8 | `=SAM!I30` | 0 |
| I8 | `=SAM!L30` | 0 |
| K8 | `=IFERROR((IF(P8,0,E8)+IF(Q8,0,I8))/M8,0)` | 0 |
| M8 | `=IF(P8,0,F8)+IF(Q8,0,J8)` | 24 |
| C9 | `="Schedule C   "&SAM!D32` | Schedule C    |
| E9 | `=SAM!I45` | 0 |
| I9 | `=SAM!L45` | 0 |
| K9 | `=IFERROR((IF(P9,0,E9)+IF(Q9,0,I9))/M9,0)` | 0 |
| M9 | `=IF(P9,0,F9)+IF(Q9,0,J9)` | 24 |
| C10 | `="Schedule C   "&SAM!D47` | Schedule C    |
| E10 | `=SAM!I60` | 0 |
| I10 | `=SAM!L60` | 0 |
| K10 | `=IFERROR((IF(P10,0,E10)+IF(Q10,0,I10))/M10,0)` | 0 |
| M10 | `=IF(P10,0,F10)+IF(Q10,0,J10)` | 24 |
| C11 | `="Schedule C   "&SAM!D65` | Schedule C    |
| E11 | `=SAM!I79` | 0 |
| I11 | `=SAM!L79` | 0 |
| K11 | `=IFERROR((IF(P11,0,E11)+IF(Q11,0,I11))/M11,0)` | 0 |
| M11 | `=IF(P11,0,F11)+IF(Q11,0,J11)` | 24 |
| E12 | `=SAM!I86` | 0 |
| I12 | `=SAM!L86` | 0 |
| K12 | `=IFERROR((IF(P12,0,E12)+IF(Q12,0,I12))/M12,0)` | 0 |
| M12 | `=IF(P12,0,F12)+IF(Q12,0,J12)` | 24 |
| E13 | `=SAM!I95` | 0 |
| I13 | `=SAM!L95` | 0 |
| K13 | `=IFERROR((IF(P13,0,E13)+IF(Q13,0,I13))/M13,0)` | 0 |
| M13 | `=IF(P13,0,F13)+IF(Q13,0,J13)` | 24 |
| E14 | `=SAM!I108` | 0 |
| I14 | `=SAM!L108` | 0 |
| K14 | `=IFERROR((IF(P14,0,E14)+IF(Q14,0,I14))/M14,0)` | 0 |
| M14 | `=IF(P14,0,F14)+IF(Q14,0,J14)` | 24 |
| C16 | `="Schedule K-1   "&SAM!E113` | Schedule K-1    |
| E16 | `=SAM!I121` | 0 |
| I16 | `=SAM!L121` | 0 |
| K16 | `=IFERROR((IF(P16,0,E16)+IF(Q16,0,I16))/M16,0)` | 0 |
| M16 | `=IF(P16,0,F16)+IF(Q16,0,J16)` | 24 |
| C17 | `="W-2 Wages   "&SAM!E113` | W-2 Wages    |
| E17 | `=SAM!I125` | 0 |
| I17 | `=SAM!L125` | 0 |
| K17 | `=IFERROR((IF(P17,0,E17)+IF(Q17,0,I17))/M17,0)` | 0 |
| M17 | `=IF(P17,0,F17)+IF(Q17,0,J17)` | 24 |
| C18 | `="Form 1065   "&SAM!E113` | Form 1065    |
| E18 | `=SAM!I142` | 0 |
| I18 | `=SAM!L142` | 0 |
| K18 | `=IFERROR((IF(P18,0,E18)+IF(Q18,0,I18))/M18,0)` | 0 |
| M18 | `=IF(P18,0,F18)+IF(Q18,0,J18)` | 24 |
| C19 | `="Partnership  "&SAM!E113&"  Subtotal"` | Partnership    Subtotal |
| E19 | `=SUMIF(P16:P18,FALSE,E16:E18)` | 0 |
| I19 | `=SUMIF(Q16:Q18,FALSE,I16:I18)` | 0 |
| K19 | `=K16+K17+K18` | 0 |
| C20 | `="Schedule K-1   "&SAM!E145` | Schedule K-1    |
| E20 | `=SAM!I153` | 0 |
| I20 | `=SAM!L153` | 0 |
| K20 | `=IFERROR((IF(P20,0,E20)+IF(Q20,0,I20))/M20,0)` | 0 |
| M20 | `=IF(P20,0,F20)+IF(Q20,0,J20)` | 24 |
| C21 | `="W-2 Wages   "&SAM!E145` | W-2 Wages    |
| E21 | `=SAM!I157` | 0 |
| I21 | `=SAM!L157` | 0 |
| K21 | `=IFERROR((IF(P21,0,E21)+IF(Q21,0,I21))/M21,0)` | 0 |
| M21 | `=IF(P21,0,F21)+IF(Q21,0,J21)` | 24 |
| C22 | `="Form 1065   "&SAM!E145` | Form 1065    |
| E22 | `=SAM!I174` | 0 |
| I22 | `=SAM!L174` | 0 |
| K22 | `=IFERROR((IF(P22,0,E22)+IF(Q22,0,I22))/M22,0)` | 0 |
| M22 | `=IF(P22,0,F22)+IF(Q22,0,J22)` | 24 |
| C23 | `="Partnership  "&SAM!E145&"  Subtotal"` | Partnership    Subtotal |
| E23 | `=SUMIF(P20:P22,FALSE,E20:E22)` | 0 |
| I23 | `=SUMIF(Q20:Q22,FALSE,I20:I22)` | 0 |
| K23 | `=K20+K21+K22` | 0 |
| C24 | `="Schedule K-1   "&SAM!E177` | Schedule K-1    |
| E24 | `=SAM!I185` | 0 |
| I24 | `=SAM!L185` | 0 |
| K24 | `=IFERROR((IF(P24,0,E24)+IF(Q24,0,I24))/M24,0)` | 0 |
| M24 | `=IF(P24,0,F24)+IF(Q24,0,J24)` | 24 |
| C25 | `="W-2 Wages   "&SAM!E177` | W-2 Wages    |
| E25 | `=SAM!I189` | 0 |
| I25 | `=SAM!L189` | 0 |
| K25 | `=IFERROR((IF(P25,0,E25)+IF(Q25,0,I25))/M25,0)` | 0 |
| M25 | `=IF(P25,0,F25)+IF(Q25,0,J25)` | 24 |
| C26 | `="Form 1065   "&SAM!E177` | Form 1065    |
| E26 | `=SAM!I206` | 0 |
| I26 | `=SAM!L206` | 0 |
| K26 | `=IFERROR((IF(P26,0,E26)+IF(Q26,0,I26))/M26,0)` | 0 |
| M26 | `=IF(P26,0,F26)+IF(Q26,0,J26)` | 24 |
| C27 | `="Partnership  "&SAM!E177&"  Subtotal"` | Partnership    Subtotal |
| E27 | `=SUMIF(P24:P26,FALSE,E24:E26)` | 0 |
| I27 | `=SUMIF(Q24:Q26,FALSE,I24:I26)` | 0 |
| K27 | `=K24+K25+K26` | 0 |
| C28 | `="Schedule K-1   "&SAM!E209` | Schedule K-1    |
| E28 | `=SAM!I217` | 0 |
| I28 | `=SAM!L217` | 0 |
| K28 | `=IFERROR((IF(P28,0,E28)+IF(Q28,0,I28))/M28,0)` | 0 |
| M28 | `=IF(P28,0,F28)+IF(Q28,0,J28)` | 24 |
| C29 | `="W-2 Wages   "&SAM!E209` | W-2 Wages    |
| E29 | `=SAM!I221` | 0 |
| I29 | `=SAM!L221` | 0 |
| K29 | `=IFERROR((IF(P29,0,E29)+IF(Q29,0,I29))/M29,0)` | 0 |
| M29 | `=IF(P29,0,F29)+IF(Q29,0,J29)` | 24 |
| C30 | `="Form 1065   "&SAM!E209` | Form 1065    |
| E30 | `=SAM!I238` | 0 |
| I30 | `=SAM!L238` | 0 |
| K30 | `=IFERROR((IF(P30,0,E30)+IF(Q30,0,I30))/M30,0)` | 0 |
| M30 | `=IF(P30,0,F30)+IF(Q30,0,J30)` | 24 |
| C31 | `="Partnership  "&SAM!E209&"  Subtotal"` | Partnership    Subtotal |
| E31 | `=SUMIF(P28:P30,FALSE,E28:E30)` | 0 |
| I31 | `=SUMIF(Q28:Q30,FALSE,I28:I30)` | 0 |
| K31 | `=K28+K29+K30` | 0 |
| C32 | `="Schedule K-1   "&SAM!E243` | Schedule K-1    |
| E32 | `=SAM!I250` | 0 |
| I32 | `=SAM!L250` | 0 |
| K32 | `=IFERROR((IF(P32,0,E32)+IF(Q32,0,I32))/M32,0)` | 0 |
| M32 | `=IF(P32,0,F32)+IF(Q32,0,J32)` | 24 |
| C33 | `="W-2 Wages   "&SAM!E243` | W-2 Wages    |
| E33 | `=SAM!I254` | 0 |
| I33 | `=SAM!L254` | 0 |
| K33 | `=IFERROR((IF(P33,0,E33)+IF(Q33,0,I33))/M33,0)` | 0 |
| M33 | `=IF(P33,0,F33)+IF(Q33,0,J33)` | 24 |
| C34 | `="Form 1120S   "&SAM!E243` | Form 1120S    |
| E34 | `=SAM!I270` | 0 |
| I34 | `=SAM!L270` | 0 |
| K34 | `=IFERROR((IF(P34,0,E34)+IF(Q34,0,I34))/M34,0)` | 0 |
| M34 | `=IF(P34,0,F34)+IF(Q34,0,J34)` | 24 |
| C35 | `="S Corporation  "&SAM!E243&"  Subtotal"` | S Corporation    Subtotal |
| E35 | `=SUMIF(P32:P34,FALSE,E32:E34)` | 0 |
| I35 | `=SUMIF(Q32:Q34,FALSE,I32:I34)` | 0 |
| K35 | `=ROUND(K32,2)+ROUND(K33,2)+ROUND(K34,2)` | 0 |
| C36 | `="Schedule K-1   "&SAM!E273` | Schedule K-1    |
| E36 | `=SAM!I280` | 0 |
| I36 | `=SAM!L280` | 0 |
| K36 | `=IFERROR((IF(P36,0,E36)+IF(Q36,0,I36))/M36,0)` | 0 |
| M36 | `=IF(P36,0,F36)+IF(Q36,0,J36)` | 24 |
| C37 | `="W-2 Wages   "&SAM!E273` | W-2 Wages    |
| E37 | `=SAM!I284` | 0 |
| I37 | `=SAM!L284` | 0 |
| K37 | `=IFERROR((IF(P37,0,E37)+IF(Q37,0,I37))/M37,0)` | 0 |
| M37 | `=IF(P37,0,F37)+IF(Q37,0,J37)` | 24 |
| C38 | `="Form 1120S   "&SAM!E273` | Form 1120S    |
| E38 | `=SAM!I300` | 0 |
| I38 | `=SAM!L300` | 0 |
| K38 | `=IFERROR((IF(P38,0,E38)+IF(Q38,0,I38))/M38,0)` | 0 |
| M38 | `=IF(P38,0,F38)+IF(Q38,0,J38)` | 24 |
| C39 | `="S Corporation  "&SAM!E273&"  Subtotal"` | S Corporation    Subtotal |
| E39 | `=SUMIF(P36:P38,FALSE,E36:E38)` | 0 |
| I39 | `=SUMIF(Q36:Q38,FALSE,I36:I38)` | 0 |
| K39 | `=ROUND(K36,2)+ROUND(K37,2)+ROUND(K38,2)` | 0 |
| C40 | `="Schedule K-1   "&SAM!E303` | Schedule K-1    |
| E40 | `=SAM!I310` | 0 |
| I40 | `=SAM!L310` | 0 |
| K40 | `=IFERROR((IF(P40,0,E40)+IF(Q40,0,I40))/M40,0)` | 0 |
| M40 | `=IF(P40,0,F40)+IF(Q40,0,J40)` | 24 |
| C41 | `="W-2 Wages   "&SAM!E303` | W-2 Wages    |
| E41 | `=SAM!I314` | 0 |
| I41 | `=SAM!L314` | 0 |
| K41 | `=IFERROR((IF(P41,0,E41)+IF(Q41,0,I41))/M41,0)` | 0 |
| M41 | `=IF(P41,0,F41)+IF(Q41,0,J41)` | 24 |
| C42 | `="Form 1120S   "&SAM!E303` | Form 1120S    |
| E42 | `=SAM!I330` | 0 |
| I42 | `=SAM!L330` | 0 |
| K42 | `=IFERROR((IF(P42,0,E42)+IF(Q42,0,I42))/M42,0)` | 0 |
| M42 | `=IF(P42,0,F42)+IF(Q42,0,J42)` | 24 |
| C43 | `="S Corporation  "&SAM!E303&"  Subtotal"` | S Corporation    Subtotal |
| E43 | `=SUMIF(P40:P42,FALSE,E40:E42)` | 0 |
| I43 | `=SUMIF(Q40:Q42,FALSE,I40:I42)` | 0 |
| K43 | `=ROUND(K40,2)+ROUND(K41,2)+ROUND(K42,2)` | 0 |
| C44 | `="Schedule K-1   "&SAM!E333` | Schedule K-1    |
| E44 | `=SAM!I340` | 0 |
| I44 | `=SAM!L340` | 0 |
| K44 | `=IFERROR((IF(P44,0,E44)+IF(Q44,0,I44))/M44,0)` | 0 |
| M44 | `=IF(P44,0,F44)+IF(Q44,0,J44)` | 24 |
| C45 | `="W-2 Wages   "&SAM!E333` | W-2 Wages    |
| E45 | `=SAM!I344` | 0 |
| I45 | `=SAM!L344` | 0 |
| K45 | `=IFERROR((IF(P45,0,E45)+IF(Q45,0,I45))/M45,0)` | 0 |
| M45 | `=IF(P45,0,F45)+IF(Q45,0,J45)` | 24 |
| C46 | `="Form 1120S   "&SAM!E333` | Form 1120S    |
| E46 | `=SAM!I360` | 0 |
| I46 | `=SAM!L360` | 0 |
| K46 | `=IFERROR((IF(P46,0,E46)+IF(Q46,0,I46))/M46,0)` | 0 |
| M46 | `=IF(P46,0,F46)+IF(Q46,0,J46)` | 24 |
| C47 | `="S Corporation  "&SAM!E333&"  Subtotal"` | S Corporation    Subtotal |
| E47 | `=SUMIF(P44:P46,FALSE,E44:E46)` | 0 |
| I47 | `=SUMIF(Q44:Q46,FALSE,I44:I46)` | 0 |
| K47 | `=ROUND(K44,2)+ROUND(K45,2)+ROUND(K46,2)` | 0 |
| C49 | `="W-2 Wages   "&SAM!E365` | W-2 Wages    |
| E49 | `=SAM!I369` | 0 |
| I49 | `=SAM!L369` | 0 |
| K49 | `=IFERROR((IF(P49,0,E49)+IF(Q49,0,I49))/M49,0)` | 0 |
| M49 | `=IF(P49,0,F49)+IF(Q49,0,J49)` | 24 |
| C50 | `="Form 1120   "&SAM!E365` | Form 1120    |
| E50 | `=SAM!I389` | 0 |
| I50 | `=SAM!L389` | 0 |
| K50 | `=IFERROR((IF(P50,0,E50)+IF(Q50,0,I50))/M50,0)` | 0 |
| M50 | `=IF(P50,0,F50)+IF(Q50,0,J50)` | 24 |
| C51 | `="Corporation  "&SAM!E365&"  Subtotal"` | Corporation    Subtotal |
| E51 | `=SUMIF(P49:P50,FALSE,E49:E50)` | 0 |
| I51 | `=SUMIF(Q49:Q50,FALSE,I49:I50)` | 0 |
| K51 | `=K49+K50` | 0 |
| C52 | `="W-2 Wages   "&SAM!E392` | W-2 Wages    |
| E52 | `=SAM!I396` | 0 |
| I52 | `=SAM!L396` | 0 |
| K52 | `=IFERROR((IF(P52,0,E52)+IF(Q52,0,I52))/M52,0)` | 0 |
| M52 | `=IF(P52,0,F52)+IF(Q52,0,J52)` | 24 |
| C53 | `="Form 1120   "&SAM!E392` | Form 1120    |
| E53 | `=SAM!I416` | 0 |
| I53 | `=SAM!L416` | 0 |
| K53 | `=IFERROR((IF(P53,0,E53)+IF(Q53,0,I53))/M53,0)` | 0 |
| M53 | `=IF(P53,0,F53)+IF(Q53,0,J53)` | 24 |
| C54 | `="Corporation  "&SAM!E392&"  Subtotal"` | Corporation    Subtotal |
| E54 | `=SUMIF(P52:P53,FALSE,E52:E53)` | 0 |
| I54 | `=SUMIF(Q52:Q53,FALSE,I52:I53)` | 0 |
| K54 | `=K52+K53` | 0 |
| C55 | `="W-2 Wages   "&SAM!E419` | W-2 Wages    |
| E55 | `=SAM!I423` | 0 |
| I55 | `=SAM!L423` | 0 |
| K55 | `=IFERROR((IF(P55,0,E55)+IF(Q55,0,I55))/M55,0)` | 0 |
| M55 | `=IF(P55,0,F55)+IF(Q55,0,J55)` | 24 |
| C56 | `="Form 1120   "&SAM!E419` | Form 1120    |
| E56 | `=SAM!I443` | 0 |
| I56 | `=SAM!L443` | 0 |
| K56 | `=IFERROR((IF(P56,0,E56)+IF(Q56,0,I56))/M56,0)` | 0 |
| M56 | `=IF(P56,0,F56)+IF(Q56,0,J56)` | 24 |
| C57 | `="Corporation  "&SAM!E419&"  Subtotal"` | Corporation    Subtotal |
| E57 | `=SUMIF(P55:P56,FALSE,E55:E56)` | 0 |
| I57 | `=SUMIF(Q55:Q56,FALSE,I55:I56)` | 0 |
| K57 | `=K55+K56` | 0 |
| K58 | `=SUMIF(Q7:Q57,"<>",K7:K57)` | 0 |

## Sheet: Liquidity

### Detected sections

#### Liquidity Worksheet  (row 1)

| Line | Row | IRS / Label |
|---|---|---|
| 1 | 9 | Cash: Line 1, Column d |
| 2 | 10 | Trade notes and accounts receivable, less bad debt: Line 2b, Column d |
| 3 | 11 | Inventories: Line 3, Column d |
| 4 | 12 | Other: |
| 5 | 13 | Total Current Assets: |
| 6 | 16 | Accounts Payable: Form 1120S Line 16/Form 1065 Line 15, Column d |
| 7 | 17 | Mortgages, notes, bonds payable < 1 year: Form 1120S Line 17/Form 1065 Line 16, Column d |
| 8 | 18 | Other current liabilities: Form 1120S Line 18/Form 1065 Line 17, Column d |
| 9 | 19 | Total Current Liabilities: |
| 1 | 36 | Cash: Line 1, Column d |
| 2 | 37 | Trade notes and accounts receivable, less bad debt: Line 2b, Column d |
| 3 | 38 | Inventories: Line 3, Column d |
| 4 | 39 | Other: |
| 5 | 40 | Total Current Assets: |
| 6 | 43 | Accounts Payable: Form 1120S Line 16/Form 1065 Line 15, Column d |
| 7 | 44 | Mortgages, notes, bonds payable < 1 year: Form 1120S Line 17/Form 1065 Line 16, Column d |
| 8 | 45 | Other current liabilities: Form 1120S Line 18/Form 1065 Line 17, Column d |
| 9 | 46 | Total Current Liabilities: |
| 1 | 62 | Cash: Line 1, Column d |
| 2 | 63 | Trade notes and accounts receivable, less bad debt: Line 2b, Column d |
| 3 | 64 | Inventories: Line 3, Column d |
| 4 | 65 | Other: |
| 5 | 66 | Total Current Assets: |
| 6 | 69 | Accounts Payable: Form 1120S Line 16/Form 1065 Line 15, Column d |
| 7 | 70 | Mortgages, notes, bonds payable < 1 year: Form 1120S Line 17/Form 1065 Line 16, Column d |
| 8 | 71 | Other current liabilities: Form 1120S Line 18/Form 1065 Line 17, Column d |
| 9 | 72 | Total Current Liabilities: |
| 1 | 88 | Cash: Line 1, Column d |
| 2 | 89 | Trade notes and accounts receivable, less bad debt: Line 2b, Column d |
| 3 | 90 | Inventories: Line 3, Column d |
| 4 | 91 | Other: |
| 5 | 92 | Total Current Assets: |
| 6 | 95 | Accounts Payable: Form 1120S Line 16/Form 1065 Line 15, Column d |
| 7 | 96 | Mortgages, notes, bonds payable < 1 year: Form 1120S Line 17/Form 1065 Line 16, Column d |
| 8 | 97 | Other current liabilities: Form 1120S Line 18/Form 1065 Line 17, Column d |
| 9 | 98 | Total Current Liabilities: |
| 1 | 114 | Cash: Line 1, Column d |
| 2 | 115 | Trade notes and accounts receivable, less bad debt: Line 2b, Column d |
| 3 | 116 | Inventories: Line 3, Column d |
| 4 | 117 | Other: |
| 5 | 118 | Total Current Assets: |
| 6 | 121 | Accounts Payable: Form 1120S Line 16/Form 1065 Line 15, Column d |
| 7 | 122 | Mortgages, notes, bonds payable < 1 year: Form 1120S Line 17/Form 1065 Line 16, Column d |
| 8 | 123 | Other current liabilities: Form 1120S Line 18/Form 1065 Line 17, Column d |
| 9 | 124 | Total Current Liabilities: |
| 1 | 140 | Cash: Line 1, Column d |
| 2 | 141 | Trade notes and accounts receivable, less bad debt: Line 2b, Column d |
| 3 | 142 | Inventories: Line 3, Column d |
| 4 | 143 | Other: |
| 5 | 144 | Total Current Assets: |
| 6 | 147 | Accounts Payable: Form 1120S Line 16/Form 1065 Line 15, Column d |
| 7 | 148 | Mortgages, notes, bonds payable < 1 year: Form 1120S Line 17/Form 1065 Line 16, Column d |
| 8 | 149 | Other current liabilities: Form 1120S Line 18/Form 1065 Line 17, Column d |
| 9 | 150 | Total Current Liabilities: |
| 1 | 166 | Cash: Line 1, Column d |
| 2 | 167 | Trade notes and accounts receivable, less bad debt: Line 2b, Column d |
| 3 | 168 | Inventories: Line 3, Column d |
| 4 | 169 | Other: |
| 5 | 170 | Total Current Assets: |
| 6 | 173 | Accounts Payable: Form 1120S Line 16/Form 1065 Line 15, Column d |
| 7 | 174 | Mortgages, notes, bonds payable < 1 year: Form 1120S Line 17/Form 1065 Line 16, Column d |
| 8 | 175 | Other current liabilities: Form 1120S Line 18/Form 1065 Line 17, Column d |
| 9 | 176 | Total Current Liabilities: |
| 1 | 192 | Cash: Line 1, Column d |
| 2 | 193 | Trade notes and accounts receivable, less bad debt: Line 2b, Column d |
| 3 | 194 | Inventories: Line 3, Column d |
| 4 | 195 | Other: |
| 5 | 196 | Total Current Assets: |
| 6 | 199 | Accounts Payable: Form 1120S Line 16/Form 1065 Line 15, Column d |
| 7 | 200 | Mortgages, notes, bonds payable < 1 year: Form 1120S Line 17/Form 1065 Line 16, Column d |
| 8 | 201 | Other current liabilities: Form 1120S Line 18/Form 1065 Line 17, Column d |
| 9 | 202 | Total Current Liabilities: |

### Formulas (176)

| Coord | Formula | Cached value |
|---|---|---|
| H13 | `=SUM(H9:H12)` | 0 |
| K13 | `=SUM(K9:K12)` | 0 |
| H14 | `=IF(ISNUMBER(H7),H7,"")` |  |
| K14 | `=IF(ISNUMBER(K7),K7,"")` |  |
| H19 | `=SUM(H16:H18)` | 0 |
| K19 | `=SUM(K16:K18)` | 0 |
| H21 | `=IF(ISNUMBER(H7),H7,"")` |  |
| K21 | `=IF(ISNUMBER(K7),K7,"")` |  |
| H22 | `=$H13` | 0 |
| K22 | `=$K13` | 0 |
| H23 | `=$H19` | 0 |
| K23 | `=$K19` | 0 |
| H24 | `=IFERROR(H22/H23,"N/A")` | N/A |
| K24 | `=IFERROR(K22/K23,"N/A")` | N/A |
| H26 | `=IF(ISNUMBER(H7),H7,"")` |  |
| K26 | `=IF(ISNUMBER(K7),K7,"")` |  |
| H27 | `=$H9+$H10+$H12` | 0 |
| K27 | `=$K9+$K10+$K12` | 0 |
| H28 | `=H19` | 0 |
| K28 | `=K19` | 0 |
| H29 | `=IFERROR(H27/H28,"N/A")` | N/A |
| K29 | `=IFERROR(K27/K28,"N/A")` | N/A |
| H40 | `=SUM(H36:H39)` | 0 |
| K40 | `=SUM(K36:K39)` | 0 |
| H41 | `=IF(ISNUMBER(H34),H34,"")` |  |
| K41 | `=IF(ISNUMBER(K34),K34,"")` |  |
| H46 | `=SUM(H43:H45)` | 0 |
| K46 | `=SUM(K43:K45)` | 0 |
| H48 | `=IF(ISNUMBER(H34),H34,"")` |  |
| K48 | `=IF(ISNUMBER(K34),K34,"")` |  |
| H49 | `=$H40` | 0 |
| K49 | `=$K40` | 0 |
| H50 | `=$H46` | 0 |
| K50 | `=$K46` | 0 |
| H51 | `=IFERROR(H49/H50,"N/A")` | N/A |
| K51 | `=IFERROR(K49/K50,"N/A")` | N/A |
| H53 | `=IF(ISNUMBER(H34),H34,"")` |  |
| K53 | `=IF(ISNUMBER(K34),K34,"")` |  |
| H54 | `=$H36+$H37+$H39` | 0 |
| K54 | `=$K36+$K37+$K39` | 0 |
| H55 | `=H46` | 0 |
| K55 | `=K46` | 0 |
| H56 | `=IFERROR(H54/H55,"N/A")` | N/A |
| K56 | `=IFERROR(K54/K55,"N/A")` | N/A |
| H66 | `=SUM(H62:H65)` | 0 |
| K66 | `=SUM(K62:K65)` | 0 |
| H67 | `=IF(ISNUMBER(H60),H60,"")` |  |
| K67 | `=IF(ISNUMBER(K60),K60,"")` |  |
| H72 | `=SUM(H69:H71)` | 0 |
| K72 | `=SUM(K69:K71)` | 0 |
| H74 | `=IF(ISNUMBER(H60),H60,"")` |  |
| K74 | `=IF(ISNUMBER(K60),K60,"")` |  |
| H75 | `=$H66` | 0 |
| K75 | `=$K66` | 0 |
| H76 | `=$H72` | 0 |
| K76 | `=$K72` | 0 |
| H77 | `=IFERROR(H75/H76,"N/A")` | N/A |
| K77 | `=IFERROR(K75/K76,"N/A")` | N/A |
| H79 | `=IF(ISNUMBER(H60),H60,"")` |  |
| K79 | `=IF(ISNUMBER(K60),K60,"")` |  |
| H80 | `=$H62+$H63+$H65` | 0 |
| K80 | `=$K62+$K63+$K65` | 0 |
| H81 | `=H72` | 0 |
| K81 | `=K72` | 0 |
| H82 | `=IFERROR(H80/H81,"N/A")` | N/A |
| K82 | `=IFERROR(K80/K81,"N/A")` | N/A |
| H92 | `=SUM(H88:H91)` | 0 |
| K92 | `=SUM(K88:K91)` | 0 |
| H93 | `=IF(ISNUMBER(H86),H86,"")` |  |
| K93 | `=IF(ISNUMBER(K86),K86,"")` |  |
| H98 | `=SUM(H95:H97)` | 0 |
| K98 | `=SUM(K95:K97)` | 0 |
| H100 | `=IF(ISNUMBER(H86),H86,"")` |  |
| K100 | `=IF(ISNUMBER(K86),K86,"")` |  |
| H101 | `=$H92` | 0 |
| K101 | `=$K92` | 0 |
| H102 | `=$H98` | 0 |
| K102 | `=$K98` | 0 |
| H103 | `=IFERROR(H101/H102,"N/A")` | N/A |
| K103 | `=IFERROR(K101/K102,"N/A")` | N/A |
| H105 | `=IF(ISNUMBER(H86),H86,"")` |  |
| K105 | `=IF(ISNUMBER(K86),K86,"")` |  |
| H106 | `=$H88+$H89+$H91` | 0 |
| K106 | `=$K88+$K89+$K91` | 0 |
| H107 | `=H98` | 0 |
| K107 | `=K98` | 0 |
| H108 | `=IFERROR(H106/H107,"N/A")` | N/A |
| K108 | `=IFERROR(K106/K107,"N/A")` | N/A |
| H118 | `=SUM(H114:H117)` | 0 |
| K118 | `=SUM(K114:K117)` | 0 |
| H119 | `=IF(ISNUMBER(H112),H112,"")` |  |
| K119 | `=IF(ISNUMBER(K112),K112,"")` |  |
| H124 | `=SUM(H121:H123)` | 0 |
| K124 | `=SUM(K121:K123)` | 0 |
| H126 | `=IF(ISNUMBER(H112),H112,"")` |  |
| K126 | `=IF(ISNUMBER(K112),K112,"")` |  |
| H127 | `=$H118` | 0 |
| K127 | `=$K118` | 0 |
| H128 | `=$H124` | 0 |
| K128 | `=$K124` | 0 |
| H129 | `=IFERROR(H127/H128,"N/A")` | N/A |
| K129 | `=IFERROR(K127/K128,"N/A")` | N/A |
| H131 | `=IF(ISNUMBER(H112),H112,"")` |  |
| K131 | `=IF(ISNUMBER(K112),K112,"")` |  |
| H132 | `=$H114+$H115+$H117` | 0 |
| K132 | `=$K114+$K115+$K117` | 0 |
| H133 | `=H124` | 0 |
| K133 | `=K124` | 0 |
| H134 | `=IFERROR(H132/H133,"N/A")` | N/A |
| K134 | `=IFERROR(K132/K133,"N/A")` | N/A |
| H144 | `=SUM(H140:H143)` | 0 |
| K144 | `=SUM(K140:K143)` | 0 |
| H145 | `=IF(ISNUMBER(H138),H138,"")` |  |
| K145 | `=IF(ISNUMBER(K138),K138,"")` |  |
| H150 | `=SUM(H147:H149)` | 0 |
| K150 | `=SUM(K147:K149)` | 0 |
| H152 | `=IF(ISNUMBER(H138),H138,"")` |  |
| K152 | `=IF(ISNUMBER(K138),K138,"")` |  |
| H153 | `=$H144` | 0 |
| K153 | `=$K144` | 0 |
| H154 | `=$H150` | 0 |
| K154 | `=$K150` | 0 |
| H155 | `=IFERROR(H153/H154,"N/A")` | N/A |
| K155 | `=IFERROR(K153/K154,"N/A")` | N/A |
| H157 | `=IF(ISNUMBER(H138),H138,"")` |  |
| K157 | `=IF(ISNUMBER(K138),K138,"")` |  |
| H158 | `=$H140+$H141+$H143` | 0 |
| K158 | `=$K140+$K141+$K143` | 0 |
| H159 | `=H150` | 0 |
| K159 | `=K150` | 0 |
| H160 | `=IFERROR(H158/H159,"N/A")` | N/A |
| K160 | `=IFERROR(K158/K159,"N/A")` | N/A |
| H170 | `=SUM(H166:H169)` | 0 |
| K170 | `=SUM(K166:K169)` | 0 |
| H171 | `=IF(ISNUMBER(H164),H164,"")` |  |
| K171 | `=IF(ISNUMBER(K164),K164,"")` |  |
| H176 | `=SUM(H173:H175)` | 0 |
| K176 | `=SUM(K173:K175)` | 0 |
| H178 | `=IF(ISNUMBER(H164),H164,"")` |  |
| K178 | `=IF(ISNUMBER(K164),K164,"")` |  |
| H179 | `=$H170` | 0 |
| K179 | `=$K170` | 0 |
| H180 | `=$H176` | 0 |
| K180 | `=$K176` | 0 |
| H181 | `=IFERROR(H179/H180,"N/A")` | N/A |
| K181 | `=IFERROR(K179/K180,"N/A")` | N/A |
| H183 | `=IF(ISNUMBER(H164),H164,"")` |  |
| K183 | `=IF(ISNUMBER(K164),K164,"")` |  |
| H184 | `=$H166+$H167+$H169` | 0 |
| K184 | `=$K166+$K167+$K169` | 0 |
| H185 | `=H176` | 0 |
| K185 | `=K176` | 0 |
| H186 | `=IFERROR(H184/H185,"N/A")` | N/A |
| K186 | `=IFERROR(K184/K185,"N/A")` | N/A |
| H196 | `=SUM(H192:H195)` | 0 |
| K196 | `=SUM(K192:K195)` | 0 |
| H197 | `=IF(ISNUMBER(H190),H190,"")` |  |
| K197 | `=IF(ISNUMBER(K190),K190,"")` |  |
| H202 | `=SUM(H199:H201)` | 0 |
| K202 | `=SUM(K199:K201)` | 0 |
| H204 | `=IF(ISNUMBER(H190),H190,"")` |  |
| K204 | `=IF(ISNUMBER(K190),K190,"")` |  |
| H205 | `=$H196` | 0 |
| K205 | `=$K196` | 0 |
| H206 | `=$H202` | 0 |
| K206 | `=$K202` | 0 |
| H207 | `=IFERROR(H205/H206,"N/A")` | N/A |
| K207 | `=IFERROR(K205/K206,"N/A")` | N/A |
| H209 | `=IF(ISNUMBER(H190),H190,"")` |  |
| K209 | `=IF(ISNUMBER(K190),K190,"")` |  |
| H210 | `=$H192+$H193+$H195` | 0 |
| K210 | `=$K192+$K193+$K195` | 0 |
| H211 | `=H202` | 0 |
| K211 | `=K202` | 0 |
| H212 | `=IFERROR(H210/H211,"N/A")` | N/A |
| K212 | `=IFERROR(K210/K211,"N/A")` | N/A |

## Sheet: Comparative

### Detected sections

#### Comparative Income Analysis Worksheet  (row 1)

### Formulas (675)

| Coord | Formula | Cached value |
|---|---|---|
| S5 | `=IF(AND(ISBLANK(O5),(O7=YEAR_3)),ErrMsg_EnterAnnDate,"")` |  |
| T5 | `=O7=YEAR_3` | False |
| T6 | `=(
MONTH(O5)-1) +
ROUND((
(DAY(O5))/
(DAY(EOMONTH(O5,0)))
),2)` | 0 |
| S7 | `=IF(OR(ISBLANK(I7),ISBLANK(L7)),ErrMsg_InputTwoYears,"")` | The first two columns must contain a year |
| T8 | `=IFERROR(IF(T5,O8*(12/T6),O8),0)` | 0 |
| T9 | `=IFERROR(IF(T5,O9*(12/T6),O9),0)` | 0 |
| T10 | `=IFERROR(IF(T5,O10*(12/T6),O10),0)` | 0 |
| T11 | `=IFERROR(IF(T5,O11*(12/T6),O11),0)` | 0 |
| T15 | `=IFERROR(IF(T5,O15*(12/T6),O15),0)` | 0 |
| E20 | `=I8` | 0 |
| I20 | `=L8` | 0 |
| M20 | `=T8` | 0 |
| F21 | `=IFERROR(((I20-E20)/ABS(E20)),"-")` | - |
| K21 | `=IFERROR(((M20-I20)/ABS(I20)),"-")` | - |
| E22 | `=I8-I9` | 0 |
| I22 | `=L8-L9` | 0 |
| M22 | `=T8-T9` | 0 |
| F24 | `=IFERROR(((I22-E22)/ABS(E22)),"-")` | - |
| K24 | `=IFERROR(((M22-I22)/ABS(I22)),"-")` | - |
| E25 | `=I10` | 0 |
| I25 | `=L10` | 0 |
| M25 | `=T10` | 0 |
| F26 | `=IFERROR(((I25-E25)/ABS(E25)),"-")` | - |
| K26 | `=IFERROR(((M25-I25)/ABS(I25)),"-")` | - |
| E27 | `=I10+I11` | 0 |
| F27 | `=IFERROR(TEXT((E27/E22),"+0%;-0%")&" *","n/a*")` | n/a* |
| I27 | `=L10+L11` | 0 |
| K27 | `=IFERROR(TEXT((I27/I22),"+0%;-0%")&" *","n/a*")` | n/a* |
| M27 | `=T10+T11` | 0 |
| P27 | `=IFERROR(TEXT((M27/M22),"+0%;-0%")&" *","n/a*")` | n/a* |
| F29 | `=IFERROR(((I27-E27)/ABS(E27)),"-")` | - |
| K29 | `=IFERROR(((M27-I27)/ABS(I27)),"-")` | - |
| E30 | `=I8-I9-I10` | 0 |
| I30 | `=L8-L9-L10` | 0 |
| M30 | `=T8-T9-T10` | 0 |
| F32 | `=IFERROR(((I30-E30)/ABS(E30)),"-")` | - |
| K32 | `=IFERROR(((M30-I30)/ABS(I30)),"-")` | - |
| E33 | `=I15` | 0 |
| F33 | `=IFERROR(TEXT((E33/E22),"+0%;-0%")&" **","n/a**")` | n/a** |
| I33 | `=L15` | 0 |
| K33 | `=IFERROR(TEXT((I33/I22),"+0%;-0%")&" **","n/a**")` | n/a** |
| M33 | `=T15` | 0 |
| P33 | `=IFERROR(TEXT((M33/M22),"+0%;-0%")&" **","n/a**")` | n/a** |
| F34 | `=IFERROR(((I33-E33)/ABS(E33)),"-")` | - |
| K34 | `=IFERROR(((M33-I33)/ABS(I33)),"-")` | - |
| S38 | `=IF(AND(ISBLANK(O38),(O40=YEAR_3)),ErrMsg_EnterAnnDate,"")` |  |
| T38 | `=O40=YEAR_3` | False |
| T39 | `=(
MONTH(O38)-1) +
ROUND((
(DAY(O38))/
(DAY(EOMONTH(O38,0)))
),2)` | 0 |
| S40 | `=IF(OR(ISBLANK(I40),ISBLANK(L40)),ErrMsg_InputTwoYears,"")` | The first two columns must contain a year |
| T41 | `=IFERROR(IF(T38,O41*(12/T39),O41),0)` | 0 |
| T42 | `=IFERROR(IF(T38,O42*(12/T39),O42),0)` | 0 |
| T43 | `=IFERROR(IF(T38,O43*(12/T39),O43),0)` | 0 |
| T44 | `=IFERROR(IF(T38,O44*(12/T39),O44),0)` | 0 |
| T48 | `=IFERROR(IF(T38,O48*(12/T39),O48),0)` | 0 |
| E53 | `=I41` | 0 |
| I53 | `=L41` | 0 |
| M53 | `=T41` | 0 |
| F54 | `=IFERROR(((I53-E53)/ABS(E53)),"-")` | - |
| K54 | `=IFERROR(((M53-I53)/ABS(I53)),"-")` | - |
| E55 | `=I41-I42` | 0 |
| I55 | `=L41-L42` | 0 |
| M55 | `=T41-T42` | 0 |
| F57 | `=IFERROR(((I55-E55)/ABS(E55)),"-")` | - |
| K57 | `=IFERROR(((M55-I55)/ABS(I55)),"-")` | - |
| E58 | `=I43` | 0 |
| I58 | `=L43` | 0 |
| M58 | `=T43` | 0 |
| F59 | `=IFERROR(((I58-E58)/ABS(E58)),"-")` | - |
| K59 | `=IFERROR(((M58-I58)/ABS(I58)),"-")` | - |
| E60 | `=I43+I44` | 0 |
| F60 | `=IFERROR(TEXT((E60/E55),"+0%;-0%")&" *","n/a*")` | n/a* |
| I60 | `=L43+L44` | 0 |
| K60 | `=IFERROR(TEXT((I60/I55),"+0%;-0%")&" *","n/a*")` | n/a* |
| M60 | `=T43+T44` | 0 |
| P60 | `=IFERROR(TEXT((M60/M55),"+0%;-0%")&" *","n/a*")` | n/a* |
| F62 | `=IFERROR(((I60-E60)/ABS(E60)),"-")` | - |
| K62 | `=IFERROR(((M60-I60)/ABS(I60)),"-")` | - |
| E63 | `=I41-I42-I43` | 0 |
| I63 | `=L41-L42-L43` | 0 |
| M63 | `=T41-T42-T43` | 0 |
| F65 | `=IFERROR(((I63-E63)/ABS(E63)),"-")` | - |
| K65 | `=IFERROR(((M63-I63)/ABS(I63)),"-")` | - |
| E66 | `=I48` | 0 |
| F66 | `=IFERROR(TEXT((E66/E55),"+0%;-0%")&" **","n/a**")` | n/a** |
| I66 | `=L48` | 0 |
| K66 | `=IFERROR(TEXT((I66/I55),"+0%;-0%")&" **","n/a**")` | n/a** |
| M66 | `=T48` | 0 |
| P66 | `=IFERROR(TEXT((M66/M55),"+0%;-0%")&" **","n/a**")` | n/a** |
| F67 | `=IFERROR(((I66-E66)/ABS(E66)),"-")` | - |
| K67 | `=IFERROR(((M66-I66)/ABS(I66)),"-")` | - |
| S70 | `=IF(AND(ISBLANK(O70),(O72=YEAR_3)),ErrMsg_EnterAnnDate,"")` |  |
| T70 | `=O72=YEAR_3` | False |
| T71 | `=(
MONTH(O70)-1) +
ROUND((
(DAY(O70))/
(DAY(EOMONTH(O70,0)))
),2)` | 0 |
| S72 | `=IF(OR(ISBLANK(I72),ISBLANK(L72)),ErrMsg_InputTwoYears,"")` | The first two columns must contain a year |
| T73 | `=IFERROR(IF(T70,O73*(12/T71),O73),0)` | 0 |
| T74 | `=IFERROR(IF(T70,O74*(12/T71),O74),0)` | 0 |
| T75 | `=IFERROR(IF(T70,O75*(12/T71),O75),0)` | 0 |
| T76 | `=IFERROR(IF(T70,O76*(12/T71),O76),0)` | 0 |
| T80 | `=IFERROR(IF(T70,O80*(12/T71),O80),0)` | 0 |
| E85 | `=I73` | 0 |
| I85 | `=L73` | 0 |
| M85 | `=T73` | 0 |
| F86 | `=IFERROR(((I85-E85)/ABS(E85)),"-")` | - |
| K86 | `=IFERROR(((M85-I85)/ABS(I85)),"-")` | - |
| E87 | `=I73-I74` | 0 |
| I87 | `=L73-L74` | 0 |
| M87 | `=T73-T74` | 0 |
| F89 | `=IFERROR(((I87-E87)/ABS(E87)),"-")` | - |
| K89 | `=IFERROR(((M87-I87)/ABS(I87)),"-")` | - |
| E90 | `=I75` | 0 |
| I90 | `=L75` | 0 |
| M90 | `=T75` | 0 |
| F91 | `=IFERROR(((I90-E90)/ABS(E90)),"-")` | - |
| K91 | `=IFERROR(((M90-I90)/ABS(I90)),"-")` | - |
| E92 | `=I75+I76` | 0 |
| F92 | `=IFERROR(TEXT((E92/E87),"+0%;-0%")&" *","n/a*")` | n/a* |
| I92 | `=L75+L76` | 0 |
| K92 | `=IFERROR(TEXT((I92/I87),"+0%;-0%")&" *","n/a*")` | n/a* |
| M92 | `=T75+T76` | 0 |
| P92 | `=IFERROR(TEXT((M92/M87),"+0%;-0%")&" *","n/a*")` | n/a* |
| F94 | `=IFERROR(((I92-E92)/ABS(E92)),"-")` | - |
| K94 | `=IFERROR(((M92-I92)/ABS(I92)),"-")` | - |
| E95 | `=I73-I74-I75` | 0 |
| I95 | `=L73-L74-L75` | 0 |
| M95 | `=T73-T74-T75` | 0 |
| F97 | `=IFERROR(((I95-E95)/ABS(E95)),"-")` | - |
| K97 | `=IFERROR(((M95-I95)/ABS(I95)),"-")` | - |
| E98 | `=I80` | 0 |
| F98 | `=IFERROR(TEXT((E98/E87),"+0%;-0%")&" **","n/a**")` | n/a** |
| I98 | `=L80` | 0 |
| K98 | `=IFERROR(TEXT((I98/I87),"+0%;-0%")&" **","n/a**")` | n/a** |
| M98 | `=T80` | 0 |
| P98 | `=IFERROR(TEXT((M98/M87),"+0%;-0%")&" **","n/a**")` | n/a** |
| F99 | `=IFERROR(((I98-E98)/ABS(E98)),"-")` | - |
| K99 | `=IFERROR(((M98-I98)/ABS(I98)),"-")` | - |
| S102 | `=IF(AND(ISBLANK(O102),(O104=YEAR_3)),ErrMsg_EnterAnnDate,"")` |  |
| T102 | `=O104=YEAR_3` | False |
| T103 | `=(
MONTH(O102)-1) +
ROUND((
(DAY(O102))/
(DAY(EOMONTH(O102,0)))
),2)` | 0 |
| S104 | `=IF(OR(ISBLANK(I104),ISBLANK(L104)),ErrMsg_InputTwoYears,"")` | The first two columns must contain a year |
| T105 | `=IFERROR(IF(T102,O105*(12/T103),O105),0)` | 0 |
| T106 | `=IFERROR(IF(T102,O106*(12/T103),O106),0)` | 0 |
| T107 | `=IFERROR(IF(T102,O107*(12/T103),O107),0)` | 0 |
| T108 | `=IFERROR(IF(T102,O108*(12/T103),O108),0)` | 0 |
| T112 | `=IFERROR(IF(T102,O112*(12/T103),O112),0)` | 0 |
| E117 | `=I105` | 0 |
| I117 | `=L105` | 0 |
| M117 | `=T105` | 0 |
| F118 | `=IFERROR(((I117-E117)/ABS(E117)),"-")` | - |
| K118 | `=IFERROR(((M117-I117)/ABS(I117)),"-")` | - |
| E119 | `=I105-I106` | 0 |
| I119 | `=L105-L106` | 0 |
| M119 | `=T105-T106` | 0 |
| F121 | `=IFERROR(((I119-E119)/ABS(E119)),"-")` | - |
| K121 | `=IFERROR(((M119-I119)/ABS(I119)),"-")` | - |
| E122 | `=I107` | 0 |
| I122 | `=L107` | 0 |
| M122 | `=T107` | 0 |
| F123 | `=IFERROR(((I122-E122)/ABS(E122)),"-")` | - |
| K123 | `=IFERROR(((M122-I122)/ABS(I122)),"-")` | - |
| E124 | `=I107+I108` | 0 |
| F124 | `=IFERROR(TEXT((E124/E119),"+0%;-0%")&" *","n/a*")` | n/a* |
| I124 | `=L107+L108` | 0 |
| K124 | `=IFERROR(TEXT((I124/I119),"+0%;-0%")&" *","n/a*")` | n/a* |
| M124 | `=T107+T108` | 0 |
| P124 | `=IFERROR(TEXT((M124/M119),"+0%;-0%")&" *","n/a*")` | n/a* |
| F126 | `=IFERROR(((I124-E124)/ABS(E124)),"-")` | - |
| K126 | `=IFERROR(((M124-I124)/ABS(I124)),"-")` | - |
| E127 | `=I105-I106-I107` | 0 |
| I127 | `=L105-L106-L107` | 0 |
| M127 | `=T105-T106-T107` | 0 |
| F129 | `=IFERROR(((I127-E127)/ABS(E127)),"-")` | - |
| K129 | `=IFERROR(((M127-I127)/ABS(I127)),"-")` | - |
| E130 | `=I112` | 0 |
| F130 | `=IFERROR(TEXT((E130/E119),"+0%;-0%")&" **","n/a**")` | n/a** |
| I130 | `=L112` | 0 |
| K130 | `=IFERROR(TEXT((I130/I119),"+0%;-0%")&" **","n/a**")` | n/a** |
| M130 | `=T112` | 0 |
| P130 | `=IFERROR(TEXT((M130/M119),"+0%;-0%")&" **","n/a**")` | n/a** |
| F131 | `=IFERROR(((I130-E130)/ABS(E130)),"-")` | - |
| K131 | `=IFERROR(((M130-I130)/ABS(I130)),"-")` | - |
| S134 | `=IF(AND(ISBLANK(O134),(O136=YEAR_3)),ErrMsg_EnterAnnDate,"")` |  |
| T134 | `=O136=YEAR_3` | False |
| T135 | `=(
MONTH(O134)-1) +
ROUND((
(DAY(O134))/
(DAY(EOMONTH(O134,0)))
),2)` | 0 |
| S136 | `=IF(OR(ISBLANK(I136),ISBLANK(L136)),ErrMsg_InputTwoYears,"")` | The first two columns must contain a year |
| T137 | `=IFERROR(IF(T134,O137*(12/T135),O137),0)` | 0 |
| T138 | `=IFERROR(IF(T134,O138*(12/T135),O138),0)` | 0 |
| T139 | `=IFERROR(IF(T134,O139*(12/T135),O139),0)` | 0 |
| T140 | `=IFERROR(IF(T134,O140*(12/T135),O140),0)` | 0 |
| T144 | `=IFERROR(IF(T134,O144*(12/T135),O144),0)` | 0 |
| E149 | `=I137` | 0 |
| I149 | `=L137` | 0 |
| M149 | `=T137` | 0 |
| F150 | `=IFERROR(((I149-E149)/ABS(E149)),"-")` | - |
| K150 | `=IFERROR(((M149-I149)/ABS(I149)),"-")` | - |
| E151 | `=I137-I138` | 0 |
| I151 | `=L137-L138` | 0 |
| M151 | `=T137-T138` | 0 |
| F153 | `=IFERROR(((I151-E151)/ABS(E151)),"-")` | - |
| K153 | `=IFERROR(((M151-I151)/ABS(I151)),"-")` | - |
| E154 | `=I139` | 0 |
| I154 | `=L139` | 0 |
| M154 | `=T139` | 0 |
| F155 | `=IFERROR(((I154-E154)/ABS(E154)),"-")` | - |
| K155 | `=IFERROR(((M154-I154)/ABS(I154)),"-")` | - |
| E156 | `=I139+I140` | 0 |
| F156 | `=IFERROR(TEXT((E156/E151),"+0%;-0%")&" *","n/a*")` | n/a* |
| I156 | `=L139+L140` | 0 |
| K156 | `=IFERROR(TEXT((I156/I151),"+0%;-0%")&" *","n/a*")` | n/a* |
| M156 | `=T139+T140` | 0 |
| P156 | `=IFERROR(TEXT((M156/M151),"+0%;-0%")&" *","n/a*")` | n/a* |
| F158 | `=IFERROR(((I156-E156)/ABS(E156)),"-")` | - |
| K158 | `=IFERROR(((M156-I156)/ABS(I156)),"-")` | - |
| E159 | `=I137-I138-I139` | 0 |
| I159 | `=L137-L138-L139` | 0 |
| M159 | `=T137-T138-T139` | 0 |
| F161 | `=IFERROR(((I159-E159)/ABS(E159)),"-")` | - |
| K161 | `=IFERROR(((M159-I159)/ABS(I159)),"-")` | - |
| E162 | `=I144` | 0 |
| F162 | `=IFERROR(TEXT((E162/E151),"+0%;-0%")&" **","n/a**")` | n/a** |
| I162 | `=L144` | 0 |
| K162 | `=IFERROR(TEXT((I162/I151),"+0%;-0%")&" **","n/a**")` | n/a** |
| M162 | `=T144` | 0 |
| P162 | `=IFERROR(TEXT((M162/M151),"+0%;-0%")&" **","n/a**")` | n/a** |
| F163 | `=IFERROR(((I162-E162)/ABS(E162)),"-")` | - |
| K163 | `=IFERROR(((M162-I162)/ABS(I162)),"-")` | - |
| S166 | `=IF(AND(ISBLANK(O166),(O168=YEAR_3)),ErrMsg_EnterAnnDate,"")` |  |
| T166 | `=O168=YEAR_3` | False |
| T167 | `=(
MONTH(O166)-1) +
ROUND((
(DAY(O166))/
(DAY(EOMONTH(O166,0)))
),2)` | 0 |
| S168 | `=IF(OR(ISBLANK(I168),ISBLANK(L168)),ErrMsg_InputTwoYears,"")` | The first two columns must contain a year |
| T169 | `=IFERROR(IF(T166,O169*(12/T167),O169),0)` | 0 |
| T170 | `=IFERROR(IF(T166,O170*(12/T167),O170),0)` | 0 |
| T171 | `=IFERROR(IF(T166,O171*(12/T167),O171),0)` | 0 |
| T172 | `=IFERROR(IF(T166,O172*(12/T167),O172),0)` | 0 |
| T176 | `=IFERROR(IF(T166,O176*(12/T167),O176),0)` | 0 |
| E181 | `=I169` | 0 |
| I181 | `=L169` | 0 |
| M181 | `=T169` | 0 |
| F182 | `=IFERROR(((I181-E181)/ABS(E181)),"-")` | - |
| K182 | `=IFERROR(((M181-I181)/ABS(I181)),"-")` | - |
| E183 | `=I169-I170` | 0 |
| I183 | `=L169-L170` | 0 |
| M183 | `=T169-T170` | 0 |
| F185 | `=IFERROR(((I183-E183)/ABS(E183)),"-")` | - |
| K185 | `=IFERROR(((M183-I183)/ABS(I183)),"-")` | - |
| E186 | `=I171` | 0 |
| I186 | `=L171` | 0 |
| M186 | `=T171` | 0 |
| F187 | `=IFERROR(((I186-E186)/ABS(E186)),"-")` | - |
| K187 | `=IFERROR(((M186-I186)/ABS(I186)),"-")` | - |
| E188 | `=I171+I172` | 0 |
| F188 | `=IFERROR(TEXT((E188/E183),"+0%;-0%")&" *","n/a*")` | n/a* |
| I188 | `=L171+L172` | 0 |
| K188 | `=IFERROR(TEXT((I188/I183),"+0%;-0%")&" *","n/a*")` | n/a* |
| M188 | `=T171+T172` | 0 |
| P188 | `=IFERROR(TEXT((M188/M183),"+0%;-0%")&" *","n/a*")` | n/a* |
| F190 | `=IFERROR(((I188-E188)/ABS(E188)),"-")` | - |
| K190 | `=IFERROR(((M188-I188)/ABS(I188)),"-")` | - |
| E191 | `=I169-I170-I171` | 0 |
| I191 | `=L169-L170-L171` | 0 |
| M191 | `=T169-T170-T171` | 0 |
| F193 | `=IFERROR(((I191-E191)/ABS(E191)),"-")` | - |
| K193 | `=IFERROR(((M191-I191)/ABS(I191)),"-")` | - |
| E194 | `=I176` | 0 |
| F194 | `=IFERROR(TEXT((E194/E183),"+0%;-0%")&" **","n/a**")` | n/a** |
| I194 | `=L176` | 0 |
| K194 | `=IFERROR(TEXT((I194/I183),"+0%;-0%")&" **","n/a**")` | n/a** |
| M194 | `=T176` | 0 |
| P194 | `=IFERROR(TEXT((M194/M183),"+0%;-0%")&" **","n/a**")` | n/a** |
| F195 | `=IFERROR(((I194-E194)/ABS(E194)),"-")` | - |
| K195 | `=IFERROR(((M194-I194)/ABS(I194)),"-")` | - |
| S198 | `=IF(AND(ISBLANK(O198),(O200=YEAR_3)),ErrMsg_EnterAnnDate,"")` |  |
| T198 | `=O200=YEAR_3` | False |
| T199 | `=(
MONTH(O198)-1) +
ROUND((
(DAY(O198))/
(DAY(EOMONTH(O198,0)))
),2)` | 0 |
| S200 | `=IF(OR(ISBLANK(I200),ISBLANK(L200)),ErrMsg_InputTwoYears,"")` | The first two columns must contain a year |
| T201 | `=IFERROR(IF(T198,O201*(12/T199),O201),0)` | 0 |
| T202 | `=IFERROR(IF(T198,O202*(12/T199),O202),0)` | 0 |
| T203 | `=IFERROR(IF(T198,O203*(12/T199),O203),0)` | 0 |
| T204 | `=IFERROR(IF(T198,O204*(12/T199),O204),0)` | 0 |
| T208 | `=IFERROR(IF(T198,O208*(12/T199),O208),0)` | 0 |
| E213 | `=I201` | 0 |
| I213 | `=L201` | 0 |
| M213 | `=T201` | 0 |
| F214 | `=IFERROR(((I213-E213)/ABS(E213)),"-")` | - |
| K214 | `=IFERROR(((M213-I213)/ABS(I213)),"-")` | - |
| E215 | `=I201-I202` | 0 |
| I215 | `=L201-L202` | 0 |
| M215 | `=T201-T202` | 0 |
| F217 | `=IFERROR(((I215-E215)/ABS(E215)),"-")` | - |
| K217 | `=IFERROR(((M215-I215)/ABS(I215)),"-")` | - |
| E218 | `=I203` | 0 |
| I218 | `=L203` | 0 |
| M218 | `=T203` | 0 |
| F219 | `=IFERROR(((I218-E218)/ABS(E218)),"-")` | - |
| K219 | `=IFERROR(((M218-I218)/ABS(I218)),"-")` | - |
| E220 | `=I203+I204` | 0 |
| F220 | `=IFERROR(TEXT((E220/E215),"+0%;-0%")&" *","n/a*")` | n/a* |
| I220 | `=L203+L204` | 0 |
| K220 | `=IFERROR(TEXT((I220/I215),"+0%;-0%")&" *","n/a*")` | n/a* |
| M220 | `=T203+T204` | 0 |
| P220 | `=IFERROR(TEXT((M220/M215),"+0%;-0%")&" *","n/a*")` | n/a* |
| F222 | `=IFERROR(((I220-E220)/ABS(E220)),"-")` | - |
| K222 | `=IFERROR(((M220-I220)/ABS(I220)),"-")` | - |
| E223 | `=I201-I202-I203` | 0 |
| I223 | `=L201-L202-L203` | 0 |
| M223 | `=T201-T202-T203` | 0 |
| F225 | `=IFERROR(((I223-E223)/ABS(E223)),"-")` | - |
| K225 | `=IFERROR(((M223-I223)/ABS(I223)),"-")` | - |
| E226 | `=I208` | 0 |
| F226 | `=IFERROR(TEXT((E226/E215),"+0%;-0%")&" **","n/a**")` | n/a** |
| I226 | `=L208` | 0 |
| K226 | `=IFERROR(TEXT((I226/I215),"+0%;-0%")&" **","n/a**")` | n/a** |
| M226 | `=T208` | 0 |
| P226 | `=IFERROR(TEXT((M226/M215),"+0%;-0%")&" **","n/a**")` | n/a** |
| F227 | `=IFERROR(((I226-E226)/ABS(E226)),"-")` | - |
| K227 | `=IFERROR(((M226-I226)/ABS(I226)),"-")` | - |
| S230 | `=IF(AND(ISBLANK(O230),(O232=YEAR_3)),ErrMsg_EnterAnnDate,"")` |  |
| T230 | `=O232=YEAR_3` | False |
| T231 | `=(
MONTH(O230)-1) +
ROUND((
(DAY(O230))/
(DAY(EOMONTH(O230,0)))
),2)` | 0 |
| S232 | `=IF(OR(ISBLANK(I232),ISBLANK(L232)),ErrMsg_InputTwoYears,"")` | The first two columns must contain a year |
| T233 | `=IFERROR(IF(T230,O233*(12/T231),O233),0)` | 0 |
| T234 | `=IFERROR(IF(T230,O234*(12/T231),O234),0)` | 0 |
| T235 | `=IFERROR(IF(T230,O235*(12/T231),O235),0)` | 0 |
| T236 | `=IFERROR(IF(T230,O236*(12/T231),O236),0)` | 0 |
| T240 | `=IFERROR(IF(T230,O240*(12/T231),O240),0)` | 0 |
| E245 | `=I233` | 0 |
| I245 | `=L233` | 0 |
| M245 | `=T233` | 0 |
| F246 | `=IFERROR(((I245-E245)/ABS(E245)),"-")` | - |
| K246 | `=IFERROR(((M245-I245)/ABS(I245)),"-")` | - |
| E247 | `=I233-I234` | 0 |
| I247 | `=L233-L234` | 0 |
| M247 | `=T233-T234` | 0 |
| F249 | `=IFERROR(((I247-E247)/ABS(E247)),"-")` | - |
| K249 | `=IFERROR(((M247-I247)/ABS(I247)),"-")` | - |
| E250 | `=I235` | 0 |
| I250 | `=L235` | 0 |
| M250 | `=T235` | 0 |
| F251 | `=IFERROR(((I250-E250)/ABS(E250)),"-")` | - |
| K251 | `=IFERROR(((M250-I250)/ABS(I250)),"-")` | - |
| E252 | `=I235+I236` | 0 |
| F252 | `=IFERROR(TEXT((E252/E247),"+0%;-0%")&" *","n/a*")` | n/a* |
| I252 | `=L235+L236` | 0 |
| K252 | `=IFERROR(TEXT((I252/I247),"+0%;-0%")&" *","n/a*")` | n/a* |
| M252 | `=T235+T236` | 0 |
| P252 | `=IFERROR(TEXT((M252/M247),"+0%;-0%")&" *","n/a*")` | n/a* |
| F254 | `=IFERROR(((I252-E252)/ABS(E252)),"-")` | - |
| K254 | `=IFERROR(((M252-I252)/ABS(I252)),"-")` | - |
| E255 | `=I233-I234-I235` | 0 |
| I255 | `=L233-L234-L235` | 0 |
| M255 | `=T233-T234-T235` | 0 |
| F257 | `=IFERROR(((I255-E255)/ABS(E255)),"-")` | - |
| K257 | `=IFERROR(((M255-I255)/ABS(I255)),"-")` | - |
| E258 | `=I240` | 0 |
| F258 | `=IFERROR(TEXT((E258/E247),"+0%;-0%")&" **","n/a**")` | n/a** |
| I258 | `=L240` | 0 |
| K258 | `=IFERROR(TEXT((I258/I247),"+0%;-0%")&" **","n/a**")` | n/a** |
| M258 | `=T240` | 0 |
| P258 | `=IFERROR(TEXT((M258/M247),"+0%;-0%")&" **","n/a**")` | n/a** |
| F259 | `=IFERROR(((I258-E258)/ABS(E258)),"-")` | - |
| K259 | `=IFERROR(((M258-I258)/ABS(I258)),"-")` | - |
| S262 | `=IF(AND(ISBLANK(O262),(O264=YEAR_3)),ErrMsg_EnterAnnDate,"")` |  |
| T262 | `=O264=YEAR_3` | False |
| T263 | `=(
MONTH(O262)-1) +
ROUND((
(DAY(O262))/
(DAY(EOMONTH(O262,0)))
),2)` | 0 |
| S264 | `=IF(OR(ISBLANK(I264),ISBLANK(L264)),ErrMsg_InputTwoYears,"")` | The first two columns must contain a year |
| T265 | `=IFERROR(IF(T262,O265*(12/T263),O265),0)` | 0 |
| T266 | `=IFERROR(IF(T262,O266*(12/T263),O266),0)` | 0 |
| T267 | `=IFERROR(IF(T262,O267*(12/T263),O267),0)` | 0 |
| T268 | `=IFERROR(IF(T262,O268*(12/T263),O268),0)` | 0 |
| T272 | `=IFERROR(IF(T262,O272*(12/T263),O272),0)` | 0 |
| E277 | `=I265` | 0 |
| I277 | `=L265` | 0 |
| M277 | `=T265` | 0 |
| F278 | `=IFERROR(((I277-E277)/ABS(E277)),"-")` | - |
| K278 | `=IFERROR(((M277-I277)/ABS(I277)),"-")` | - |
| E279 | `=I265-I266` | 0 |
| I279 | `=L265-L266` | 0 |
| M279 | `=T265-T266` | 0 |
| F281 | `=IFERROR(((I279-E279)/ABS(E279)),"-")` | - |
| K281 | `=IFERROR(((M279-I279)/ABS(I279)),"-")` | - |
| E282 | `=I267` | 0 |
| I282 | `=L267` | 0 |
| M282 | `=T267` | 0 |
| F283 | `=IFERROR(((I282-E282)/ABS(E282)),"-")` | - |
| K283 | `=IFERROR(((M282-I282)/ABS(I282)),"-")` | - |
| E284 | `=I267+I268` | 0 |
| F284 | `=IFERROR(TEXT((E284/E279),"+0%;-0%")&" *","n/a*")` | n/a* |
| I284 | `=L267+L268` | 0 |
| K284 | `=IFERROR(TEXT((I284/I279),"+0%;-0%")&" *","n/a*")` | n/a* |
| M284 | `=T267+T268` | 0 |
| P284 | `=IFERROR(TEXT((M284/M279),"+0%;-0%")&" *","n/a*")` | n/a* |
| F286 | `=IFERROR(((I284-E284)/ABS(E284)),"-")` | - |
| K286 | `=IFERROR(((M284-I284)/ABS(I284)),"-")` | - |
| E287 | `=I265-I266-I267` | 0 |
| I287 | `=L265-L266-L267` | 0 |
| M287 | `=T265-T266-T267` | 0 |
| F289 | `=IFERROR(((I287-E287)/ABS(E287)),"-")` | - |
| K289 | `=IFERROR(((M287-I287)/ABS(I287)),"-")` | - |
| E290 | `=I272` | 0 |
| F290 | `=IFERROR(TEXT((E290/E279),"+0%;-0%")&" **","n/a**")` | n/a** |
| I290 | `=L272` | 0 |
| K290 | `=IFERROR(TEXT((I290/I279),"+0%;-0%")&" **","n/a**")` | n/a** |
| M290 | `=T272` | 0 |
| P290 | `=IFERROR(TEXT((M290/M279),"+0%;-0%")&" **","n/a**")` | n/a** |
| F291 | `=IFERROR(((I290-E290)/ABS(E290)),"-")` | - |
| K291 | `=IFERROR(((M290-I290)/ABS(I290)),"-")` | - |
| S294 | `=IF(AND(ISBLANK(O294),(O296=YEAR_3)),ErrMsg_EnterAnnDate,"")` |  |
| T294 | `=O296=YEAR_3` | False |
| T295 | `=(
MONTH(O294)-1) +
ROUND((
(DAY(O294))/
(DAY(EOMONTH(O294,0)))
),2)` | 0 |
| S296 | `=IF(OR(ISBLANK(I296),ISBLANK(L296)),ErrMsg_InputTwoYears,"")` | The first two columns must contain a year |
| T297 | `=IFERROR(IF(T294,O297*(12/T295),O297),0)` | 0 |
| T298 | `=IFERROR(IF(T294,O298*(12/T295),O298),0)` | 0 |
| T299 | `=IFERROR(IF(T294,O299*(12/T295),O299),0)` | 0 |
| T300 | `=IFERROR(IF(T294,O300*(12/T295),O300),0)` | 0 |
| T304 | `=IFERROR(IF(T294,O304*(12/T295),O304),0)` | 0 |
| E309 | `=I297` | 0 |
| I309 | `=L297` | 0 |
| M309 | `=T297` | 0 |
| F310 | `=IFERROR(((I309-E309)/ABS(E309)),"-")` | - |
| K310 | `=IFERROR(((M309-I309)/ABS(I309)),"-")` | - |
| E311 | `=I297-I298` | 0 |
| I311 | `=L297-L298` | 0 |
| M311 | `=T297-T298` | 0 |
| F313 | `=IFERROR(((I311-E311)/ABS(E311)),"-")` | - |
| K313 | `=IFERROR(((M311-I311)/ABS(I311)),"-")` | - |
| E314 | `=I299` | 0 |
| I314 | `=L299` | 0 |
| M314 | `=T299` | 0 |
| F315 | `=IFERROR(((I314-E314)/ABS(E314)),"-")` | - |
| K315 | `=IFERROR(((M314-I314)/ABS(I314)),"-")` | - |
| E316 | `=I299+I300` | 0 |
| F316 | `=IFERROR(TEXT((E316/E311),"+0%;-0%")&" *","n/a*")` | n/a* |
| I316 | `=L299+L300` | 0 |
| K316 | `=IFERROR(TEXT((I316/I311),"+0%;-0%")&" *","n/a*")` | n/a* |
| M316 | `=T299+T300` | 0 |
| P316 | `=IFERROR(TEXT((M316/M311),"+0%;-0%")&" *","n/a*")` | n/a* |
| F318 | `=IFERROR(((I316-E316)/ABS(E316)),"-")` | - |
| K318 | `=IFERROR(((M316-I316)/ABS(I316)),"-")` | - |
| E319 | `=I297-I298-I299` | 0 |
| I319 | `=L297-L298-L299` | 0 |
| M319 | `=T297-T298-T299` | 0 |
| F321 | `=IFERROR(((I319-E319)/ABS(E319)),"-")` | - |
| K321 | `=IFERROR(((M319-I319)/ABS(I319)),"-")` | - |
| E322 | `=I304` | 0 |
| F322 | `=IFERROR(TEXT((E322/E311),"+0%;-0%")&" **","n/a**")` | n/a** |
| I322 | `=L304` | 0 |
| K322 | `=IFERROR(TEXT((I322/I311),"+0%;-0%")&" **","n/a**")` | n/a** |
| M322 | `=T304` | 0 |
| P322 | `=IFERROR(TEXT((M322/M311),"+0%;-0%")&" **","n/a**")` | n/a** |
| F323 | `=IFERROR(((I322-E322)/ABS(E322)),"-")` | - |
| K323 | `=IFERROR(((M322-I322)/ABS(I322)),"-")` | - |
| S326 | `=IF(AND(ISBLANK(O326),(O328=YEAR_3)),ErrMsg_EnterAnnDate,"")` |  |
| T326 | `=O328=YEAR_3` | False |
| T327 | `=(
MONTH(O326)-1) +
ROUND((
(DAY(O326))/
(DAY(EOMONTH(O326,0)))
),2)` | 0 |
| S328 | `=IF(OR(ISBLANK(I328),ISBLANK(L328)),ErrMsg_InputTwoYears,"")` | The first two columns must contain a year |
| T329 | `=IFERROR(IF(T326,O329*(12/T327),O329),0)` | 0 |
| T330 | `=IFERROR(IF(T326,O330*(12/T327),O330),0)` | 0 |
| T331 | `=IFERROR(IF(T326,O331*(12/T327),O331),0)` | 0 |
| T332 | `=IFERROR(IF(T326,O332*(12/T327),O332),0)` | 0 |
| T336 | `=IFERROR(IF(T326,O336*(12/T327),O336),0)` | 0 |
| E341 | `=I329` | 0 |
| I341 | `=L329` | 0 |
| M341 | `=T329` | 0 |
| F342 | `=IFERROR(((I341-E341)/ABS(E341)),"-")` | - |
| K342 | `=IFERROR(((M341-I341)/ABS(I341)),"-")` | - |
| E343 | `=I329-I330` | 0 |
| I343 | `=L329-L330` | 0 |
| M343 | `=T329-T330` | 0 |
| F345 | `=IFERROR(((I343-E343)/ABS(E343)),"-")` | - |
| K345 | `=IFERROR(((M343-I343)/ABS(I343)),"-")` | - |
| E346 | `=I331` | 0 |
| I346 | `=L331` | 0 |
| M346 | `=T331` | 0 |
| F347 | `=IFERROR(((I346-E346)/ABS(E346)),"-")` | - |
| K347 | `=IFERROR(((M346-I346)/ABS(I346)),"-")` | - |
| E348 | `=I331+I332` | 0 |
| F348 | `=IFERROR(TEXT((E348/E343),"+0%;-0%")&" *","n/a*")` | n/a* |
| I348 | `=L331+L332` | 0 |
| K348 | `=IFERROR(TEXT((I348/I343),"+0%;-0%")&" *","n/a*")` | n/a* |
| M348 | `=T331+T332` | 0 |
| P348 | `=IFERROR(TEXT((M348/M343),"+0%;-0%")&" *","n/a*")` | n/a* |
| F350 | `=IFERROR(((I348-E348)/ABS(E348)),"-")` | - |
| K350 | `=IFERROR(((M348-I348)/ABS(I348)),"-")` | - |
| E351 | `=I329-I330-I331` | 0 |
| I351 | `=L329-L330-L331` | 0 |
| M351 | `=T329-T330-T331` | 0 |
| F353 | `=IFERROR(((I351-E351)/ABS(E351)),"-")` | - |
| K353 | `=IFERROR(((M351-I351)/ABS(I351)),"-")` | - |
| E354 | `=I336` | 0 |
| F354 | `=IFERROR(TEXT((E354/E343),"+0%;-0%")&" **","n/a**")` | n/a** |
| I354 | `=L336` | 0 |
| K354 | `=IFERROR(TEXT((I354/I343),"+0%;-0%")&" **","n/a**")` | n/a** |
| M354 | `=T336` | 0 |
| P354 | `=IFERROR(TEXT((M354/M343),"+0%;-0%")&" **","n/a**")` | n/a** |
| F355 | `=IFERROR(((I354-E354)/ABS(E354)),"-")` | - |
| K355 | `=IFERROR(((M354-I354)/ABS(I354)),"-")` | - |
| S358 | `=IF(AND(ISBLANK(O358),(O360=YEAR_3)),ErrMsg_EnterAnnDate,"")` |  |
| T358 | `=O360=YEAR_3` | False |
| T359 | `=(
MONTH(O358)-1) +
ROUND((
(DAY(O358))/
(DAY(EOMONTH(O358,0)))
),2)` | 0 |
| S360 | `=IF(OR(ISBLANK(I360),ISBLANK(L360)),ErrMsg_InputTwoYears,"")` | The first two columns must contain a year |
| T361 | `=IFERROR(IF(T358,O361*(12/T359),O361),0)` | 0 |
| T362 | `=IFERROR(IF(T358,O362*(12/T359),O362),0)` | 0 |
| T363 | `=IFERROR(IF(T358,O363*(12/T359),O363),0)` | 0 |
| T364 | `=IFERROR(IF(T358,O364*(12/T359),O364),0)` | 0 |
| T368 | `=IFERROR(IF(T358,O368*(12/T359),O368),0)` | 0 |
| E373 | `=I361` | 0 |
| I373 | `=L361` | 0 |
| M373 | `=T361` | 0 |
| F374 | `=IFERROR(((I373-E373)/ABS(E373)),"-")` | - |
| K374 | `=IFERROR(((M373-I373)/ABS(I373)),"-")` | - |
| E375 | `=I361-I362` | 0 |
| I375 | `=L361-L362` | 0 |
| M375 | `=T361-T362` | 0 |
| F377 | `=IFERROR(((I375-E375)/ABS(E375)),"-")` | - |
| K377 | `=IFERROR(((M375-I375)/ABS(I375)),"-")` | - |
| E378 | `=I363` | 0 |
| I378 | `=L363` | 0 |
| M378 | `=T363` | 0 |
| F379 | `=IFERROR(((I378-E378)/ABS(E378)),"-")` | - |
| K379 | `=IFERROR(((M378-I378)/ABS(I378)),"-")` | - |
| E380 | `=I363+I364` | 0 |
| F380 | `=IFERROR(TEXT((E380/E375),"+0%;-0%")&" *","n/a*")` | n/a* |
| I380 | `=L363+L364` | 0 |
| K380 | `=IFERROR(TEXT((I380/I375),"+0%;-0%")&" *","n/a*")` | n/a* |
| M380 | `=T363+T364` | 0 |
| P380 | `=IFERROR(TEXT((M380/M375),"+0%;-0%")&" *","n/a*")` | n/a* |
| F382 | `=IFERROR(((I380-E380)/ABS(E380)),"-")` | - |
| K382 | `=IFERROR(((M380-I380)/ABS(I380)),"-")` | - |
| E383 | `=I361-I362-I363` | 0 |
| I383 | `=L361-L362-L363` | 0 |
| M383 | `=T361-T362-T363` | 0 |
| F385 | `=IFERROR(((I383-E383)/ABS(E383)),"-")` | - |
| K385 | `=IFERROR(((M383-I383)/ABS(I383)),"-")` | - |
| E386 | `=I368` | 0 |
| F386 | `=IFERROR(TEXT((E386/E375),"+0%;-0%")&" **","n/a**")` | n/a** |
| I386 | `=L368` | 0 |
| K386 | `=IFERROR(TEXT((I386/I375),"+0%;-0%")&" **","n/a**")` | n/a** |
| M386 | `=T368` | 0 |
| P386 | `=IFERROR(TEXT((M386/M375),"+0%;-0%")&" **","n/a**")` | n/a** |
| F387 | `=IFERROR(((I386-E386)/ABS(E386)),"-")` | - |
| K387 | `=IFERROR(((M386-I386)/ABS(I386)),"-")` | - |
| S390 | `=IF(AND(ISBLANK(O390),(O392=YEAR_3)),ErrMsg_EnterAnnDate,"")` |  |
| T390 | `=O392=YEAR_3` | False |
| T391 | `=(
MONTH(O390)-1) +
ROUND((
(DAY(O390))/
(DAY(EOMONTH(O390,0)))
),2)` | 0 |
| S392 | `=IF(OR(ISBLANK(I392),ISBLANK(L392)),ErrMsg_InputTwoYears,"")` | The first two columns must contain a year |
| T393 | `=IFERROR(IF(T390,O393*(12/T391),O393),0)` | 0 |
| T394 | `=IFERROR(IF(T390,O394*(12/T391),O394),0)` | 0 |
| T395 | `=IFERROR(IF(T390,O395*(12/T391),O395),0)` | 0 |
| T396 | `=IFERROR(IF(T390,O396*(12/T391),O396),0)` | 0 |
| T400 | `=IFERROR(IF(T390,O400*(12/T391),O400),0)` | 0 |
| E405 | `=I393` | 0 |
| I405 | `=L393` | 0 |
| M405 | `=T393` | 0 |
| F406 | `=IFERROR(((I405-E405)/ABS(E405)),"-")` | - |
| K406 | `=IFERROR(((M405-I405)/ABS(I405)),"-")` | - |
| E407 | `=I393-I394` | 0 |
| I407 | `=L393-L394` | 0 |
| M407 | `=T393-T394` | 0 |
| F409 | `=IFERROR(((I407-E407)/ABS(E407)),"-")` | - |
| K409 | `=IFERROR(((M407-I407)/ABS(I407)),"-")` | - |
| E410 | `=I395` | 0 |
| I410 | `=L395` | 0 |
| M410 | `=T395` | 0 |
| F411 | `=IFERROR(((I410-E410)/ABS(E410)),"-")` | - |
| K411 | `=IFERROR(((M410-I410)/ABS(I410)),"-")` | - |
| E412 | `=I395+I396` | 0 |
| F412 | `=IFERROR(TEXT((E412/E407),"+0%;-0%")&" *","n/a*")` | n/a* |
| I412 | `=L395+L396` | 0 |
| K412 | `=IFERROR(TEXT((I412/I407),"+0%;-0%")&" *","n/a*")` | n/a* |
| M412 | `=T395+T396` | 0 |
| P412 | `=IFERROR(TEXT((M412/M407),"+0%;-0%")&" *","n/a*")` | n/a* |
| F414 | `=IFERROR(((I412-E412)/ABS(E412)),"-")` | - |
| K414 | `=IFERROR(((M412-I412)/ABS(I412)),"-")` | - |
| E415 | `=I393-I394-I395` | 0 |
| I415 | `=L393-L394-L395` | 0 |
| M415 | `=T393-T394-T395` | 0 |
| F417 | `=IFERROR(((I415-E415)/ABS(E415)),"-")` | - |
| K417 | `=IFERROR(((M415-I415)/ABS(I415)),"-")` | - |
| E418 | `=I400` | 0 |
| F418 | `=IFERROR(TEXT((E418/E407),"+0%;-0%")&" **","n/a**")` | n/a** |
| I418 | `=L400` | 0 |
| K418 | `=IFERROR(TEXT((I418/I407),"+0%;-0%")&" **","n/a**")` | n/a** |
| M418 | `=T400` | 0 |
| P418 | `=IFERROR(TEXT((M418/M407),"+0%;-0%")&" **","n/a**")` | n/a** |
| F419 | `=IFERROR(((I418-E418)/ABS(E418)),"-")` | - |
| K419 | `=IFERROR(((M418-I418)/ABS(I418)),"-")` | - |
| S422 | `=IF(AND(ISBLANK(O422),(O424=YEAR_3)),ErrMsg_EnterAnnDate,"")` |  |
| T422 | `=O424=YEAR_3` | False |
| T423 | `=(
MONTH(O422)-1) +
ROUND((
(DAY(O422))/
(DAY(EOMONTH(O422,0)))
),2)` | 0 |
| S424 | `=IF(OR(ISBLANK(I424),ISBLANK(L424)),ErrMsg_InputTwoYears,"")` | The first two columns must contain a year |
| T425 | `=IFERROR(IF(T422,O425*(12/T423),O425),0)` | 0 |
| T426 | `=IFERROR(IF(T422,O426*(12/T423),O426),0)` | 0 |
| T427 | `=IFERROR(IF(T422,O427*(12/T423),O427),0)` | 0 |
| T428 | `=IFERROR(IF(T422,O428*(12/T423),O428),0)` | 0 |
| T432 | `=IFERROR(IF(T422,O432*(12/T423),O432),0)` | 0 |
| E437 | `=I425` | 0 |
| I437 | `=L425` | 0 |
| M437 | `=T425` | 0 |
| F438 | `=IFERROR(((I437-E437)/ABS(E437)),"-")` | - |
| K438 | `=IFERROR(((M437-I437)/ABS(I437)),"-")` | - |
| E439 | `=I425-I426` | 0 |
| I439 | `=L425-L426` | 0 |
| M439 | `=T425-T426` | 0 |
| F441 | `=IFERROR(((I439-E439)/ABS(E439)),"-")` | - |
| K441 | `=IFERROR(((M439-I439)/ABS(I439)),"-")` | - |
| E442 | `=I427` | 0 |
| I442 | `=L427` | 0 |
| M442 | `=T427` | 0 |
| F443 | `=IFERROR(((I442-E442)/ABS(E442)),"-")` | - |
| K443 | `=IFERROR(((M442-I442)/ABS(I442)),"-")` | - |
| E444 | `=I427+I428` | 0 |
| F444 | `=IFERROR(TEXT((E444/E439),"+0%;-0%")&" *","n/a*")` | n/a* |
| I444 | `=L427+L428` | 0 |
| K444 | `=IFERROR(TEXT((I444/I439),"+0%;-0%")&" *","n/a*")` | n/a* |
| M444 | `=T427+T428` | 0 |
| P444 | `=IFERROR(TEXT((M444/M439),"+0%;-0%")&" *","n/a*")` | n/a* |
| F446 | `=IFERROR(((I444-E444)/ABS(E444)),"-")` | - |
| K446 | `=IFERROR(((M444-I444)/ABS(I444)),"-")` | - |
| E447 | `=I425-I426-I427` | 0 |
| I447 | `=L425-L426-L427` | 0 |
| M447 | `=T425-T426-T427` | 0 |
| F449 | `=IFERROR(((I447-E447)/ABS(E447)),"-")` | - |
| K449 | `=IFERROR(((M447-I447)/ABS(I447)),"-")` | - |
| E450 | `=I432` | 0 |
| F450 | `=IFERROR(TEXT((E450/E439),"+0%;-0%")&" **","n/a**")` | n/a** |
| I450 | `=L432` | 0 |
| K450 | `=IFERROR(TEXT((I450/I439),"+0%;-0%")&" **","n/a**")` | n/a** |
| M450 | `=T432` | 0 |
| P450 | `=IFERROR(TEXT((M450/M439),"+0%;-0%")&" **","n/a**")` | n/a** |
| F451 | `=IFERROR(((I450-E450)/ABS(E450)),"-")` | - |
| K451 | `=IFERROR(((M450-I450)/ABS(I450)),"-")` | - |
| S454 | `=IF(AND(ISBLANK(O454),(O456=YEAR_3)),ErrMsg_EnterAnnDate,"")` |  |
| T454 | `=O456=YEAR_3` | False |
| T455 | `=(
MONTH(O454)-1) +
ROUND((
(DAY(O454))/
(DAY(EOMONTH(O454,0)))
),2)` | 0 |
| S456 | `=IF(OR(ISBLANK(I456),ISBLANK(L456)),ErrMsg_InputTwoYears,"")` | The first two columns must contain a year |
| T457 | `=IFERROR(IF(T454,O457*(12/T455),O457),0)` | 0 |
| T458 | `=IFERROR(IF(T454,O458*(12/T455),O458),0)` | 0 |
| T459 | `=IFERROR(IF(T454,O459*(12/T455),O459),0)` | 0 |
| T460 | `=IFERROR(IF(T454,O460*(12/T455),O460),0)` | 0 |
| T464 | `=IFERROR(IF(T454,O464*(12/T455),O464),0)` | 0 |
| E469 | `=I457` | 0 |
| I469 | `=L457` | 0 |
| M469 | `=T457` | 0 |
| F470 | `=IFERROR(((I469-E469)/ABS(E469)),"-")` | - |
| K470 | `=IFERROR(((M469-I469)/ABS(I469)),"-")` | - |
| E471 | `=I457-I458` | 0 |
| I471 | `=L457-L458` | 0 |
| M471 | `=T457-T458` | 0 |
| F473 | `=IFERROR(((I471-E471)/ABS(E471)),"-")` | - |
| K473 | `=IFERROR(((M471-I471)/ABS(I471)),"-")` | - |
| E474 | `=I459` | 0 |
| I474 | `=L459` | 0 |
| M474 | `=T459` | 0 |
| F475 | `=IFERROR(((I474-E474)/ABS(E474)),"-")` | - |
| K475 | `=IFERROR(((M474-I474)/ABS(I474)),"-")` | - |
| E476 | `=I459+I460` | 0 |
| F476 | `=IFERROR(TEXT((E476/E471),"+0%;-0%")&" *","n/a*")` | n/a* |
| I476 | `=L459+L460` | 0 |
| K476 | `=IFERROR(TEXT((I476/I471),"+0%;-0%")&" *","n/a*")` | n/a* |
| M476 | `=T459+T460` | 0 |
| P476 | `=IFERROR(TEXT((M476/M471),"+0%;-0%")&" *","n/a*")` | n/a* |
| F478 | `=IFERROR(((I476-E476)/ABS(E476)),"-")` | - |
| K478 | `=IFERROR(((M476-I476)/ABS(I476)),"-")` | - |
| E479 | `=I457-I458-I459` | 0 |
| I479 | `=L457-L458-L459` | 0 |
| M479 | `=T457-T458-T459` | 0 |
| F481 | `=IFERROR(((I479-E479)/ABS(E479)),"-")` | - |
| K481 | `=IFERROR(((M479-I479)/ABS(I479)),"-")` | - |
| E482 | `=I464` | 0 |
| F482 | `=IFERROR(TEXT((E482/E471),"+0%;-0%")&" **","n/a**")` | n/a** |
| I482 | `=L464` | 0 |
| K482 | `=IFERROR(TEXT((I482/I471),"+0%;-0%")&" **","n/a**")` | n/a** |
| M482 | `=T464` | 0 |
| P482 | `=IFERROR(TEXT((M482/M471),"+0%;-0%")&" **","n/a**")` | n/a** |
| F483 | `=IFERROR(((I482-E482)/ABS(E482)),"-")` | - |
| K483 | `=IFERROR(((M482-I482)/ABS(I482)),"-")` | - |

## Sheet: P&L

### Detected sections

#### Profit and Loss Statement Analysis  (row 1)

#### Partnership Cash Flow  (row 85)

#### PARTNERSHIP  (row 87)

#### PARTNERSHIP  (row 113)

#### PARTNERSHIP  (row 139)

#### PARTNERSHIP  (row 165)

#### S Corporation Cash Flow  (row 191)

#### S CORPORATION  (row 193)

#### S CORPORATION  (row 218)

#### S CORPORATION  (row 243)

#### S CORPORATION  (row 268)

#### Corporation Cash Flow  (row 293)

#### CORPORATION  (row 295)

#### Corporation's Total Share of Income (Loss):  (row 313)

#### CORPORATION  (row 321)

#### Corporation's Total Share of Income (Loss):  (row 339)

#### CORPORATION  (row 347)

#### Corporation's Total Share of Income (Loss):  (row 365)

### Formulas (343)

| Coord | Formula | Cached value |
|---|---|---|
| G7 | `=IF(OR(SAM!D17=0,SAM!D17=""),"",SAM!D17)` |  |
| E18 | `=IF(MONTH(Q11)=MONTH(Q12),((YEAR(Q12)-YEAR(Q11))*12)-12+(12-MONTH(Q11))+MONTH(Q12)-1+(EOMONTH(Q11,0)-Q11+1)/DAY(EOMONTH(Q11,0))+(1-(EOMONTH(Q12,0)-Q12)/DAY(EOMONTH(Q12,0))),((YEAR(Q12)-YEAR(Q11))*12)-12+(12-MONTH(Q11))+MONTH(Q12)-1+(EOMONTH(Q11,0)-Q11+1)/DAY(EOMONTH(Q11,0))+(1-(EOMONTH(Q12,0)-Q12)/DAY(EOMONTH(Q12,0))))` | 0.032258064516129004 |
| F18 | `=ROUND(IF(AND(Q11<>"",Q12<>""),IF(E18<=1,1,E18),0),2)` | 0 |
| E19 | `=IF(MONTH(N11)=MONTH(N12),((YEAR(N12)-YEAR(N11))*12)-12+(12-MONTH(N11))+MONTH(N12)-1+(EOMONTH(N11,0)-N11+1)/DAY(EOMONTH(N11,0))+(1-(EOMONTH(N12,0)-N12)/DAY(EOMONTH(N12,0))),((YEAR(N12)-YEAR(N11))*12)-12+(12-MONTH(N11))+MONTH(N12)-1+(EOMONTH(N11,0)-N11+1)/DAY(EOMONTH(N11,0))+(1-(EOMONTH(N12,0)-N12)/DAY(EOMONTH(N12,0))))` | 0.032258064516129004 |
| F19 | `=ROUND(IF(AND(N11<>"",N12<>""),IF(E19<=1,1,E19),0),2)` | 0 |
| E20 | `=IF(MONTH(K11)=MONTH(K12),((YEAR(K12)-YEAR(K11))*12)-12+(12-MONTH(K11))+MONTH(K12)-1+(EOMONTH(K11,0)-K11+1)/DAY(EOMONTH(K11,0))+(1-(EOMONTH(K12,0)-K12)/DAY(EOMONTH(K12,0))),((YEAR(K12)-YEAR(K11))*12)-12+(12-MONTH(K11))+MONTH(K12)-1+(EOMONTH(K11,0)-K11+1)/DAY(EOMONTH(K11,0))+(1-(EOMONTH(K12,0)-K12)/DAY(EOMONTH(K12,0))))` | 0.032258064516129004 |
| F20 | `=ROUND(IF(AND(K11<>"",K12<>""),IF(E20<=1,1,E20),0),2)` | 0 |
| H22 | `=IFERROR(SUM(H16:H20)-H15+H14,0)` | 0 |
| K22 | `=IFERROR(SUM(K16:K20)-K15+K14,0)` | 0 |
| N22 | `=IFERROR(SUM(N16:N20)-N15+N14,0)` | 0 |
| Q22 | `=IFERROR(SUM(Q16:Q20)-Q15+Q14,0)` | 0 |
| E23 | `=IF(MONTH(H11)=MONTH(H12),((YEAR(H12)-YEAR(H11))*12)-12+(12-MONTH(H11))+MONTH(H12)-1+(EOMONTH(H11,0)-H11+1)/DAY(EOMONTH(H11,0))+(1-(EOMONTH(H12,0)-H12)/DAY(EOMONTH(H12,0))),((YEAR(H12)-YEAR(H11))*12)-12+(12-MONTH(H11))+MONTH(H12)-1+(EOMONTH(H11,0)-H11+1)/DAY(EOMONTH(H11,0))+(1-(EOMONTH(H12,0)-H12)/DAY(EOMONTH(H12,0))))` | 0.032258064516129004 |
| F23 | `=ROUND(IF(AND(H11<>"",H12<>""),IF(E23<=1,1,E23),0),2)` | 0 |
| H23 | `=IFERROR(H22/F23,0)` | 0 |
| K23 | `=IFERROR(K22/F20,0)` | 0 |
| N23 | `=IFERROR(N22/F19,0)` | 0 |
| Q23 | `=IFERROR(Q22/F18,0)` | 0 |
| G26 | `=IF(OR(SAM!D32=0,SAM!D32=""),"",SAM!D32)` |  |
| E37 | `=IF(MONTH(Q30)=MONTH(Q31),((YEAR(Q31)-YEAR(Q30))*12)-12+(12-MONTH(Q30))+MONTH(Q31)-1+(EOMONTH(Q30,0)-Q30+1)/DAY(EOMONTH(Q30,0))+(1-(EOMONTH(Q31,0)-Q31)/DAY(EOMONTH(Q31,0))),((YEAR(Q31)-YEAR(Q30))*12)-12+(12-MONTH(Q30))+MONTH(Q31)-1+(EOMONTH(Q30,0)-Q30+1)/DAY(EOMONTH(Q30,0))+(1-(EOMONTH(Q31,0)-Q31)/DAY(EOMONTH(Q31,0))))` | 0.032258064516129004 |
| F37 | `=ROUND(IF(AND(Q30<>"",Q31<>""),IF(E37<=1,1,E37),0),2)` | 0 |
| E38 | `=IF(MONTH(N30)=MONTH(N31),((YEAR(N31)-YEAR(N30))*12)-12+(12-MONTH(N30))+MONTH(N31)-1+(EOMONTH(N30,0)-N30+1)/DAY(EOMONTH(N30,0))+(1-(EOMONTH(N31,0)-N31)/DAY(EOMONTH(N31,0))),((YEAR(N31)-YEAR(N30))*12)-12+(12-MONTH(N30))+MONTH(N31)-1+(EOMONTH(N30,0)-N30+1)/DAY(EOMONTH(N30,0))+(1-(EOMONTH(N31,0)-N31)/DAY(EOMONTH(N31,0))))` | 0.032258064516129004 |
| F38 | `=ROUND(IF(AND(N30<>"",N31<>""),IF(E38<=1,1,E38),0),2)` | 0 |
| E39 | `=IF(MONTH(K30)=MONTH(K31),((YEAR(K31)-YEAR(K30))*12)-12+(12-MONTH(K30))+MONTH(K31)-1+(EOMONTH(K30,0)-K30+1)/DAY(EOMONTH(K30,0))+(1-(EOMONTH(K31,0)-K31)/DAY(EOMONTH(K31,0))),((YEAR(K31)-YEAR(K30))*12)-12+(12-MONTH(K30))+MONTH(K31)-1+(EOMONTH(K30,0)-K30+1)/DAY(EOMONTH(K30,0))+(1-(EOMONTH(K31,0)-K31)/DAY(EOMONTH(K31,0))))` | 0.032258064516129004 |
| F39 | `=ROUND(IF(AND(K30<>"",K31<>""),IF(E39<=1,1,E39),0),2)` | 0 |
| H41 | `=IFERROR(SUM(H35:H39)-H34+H33,0)` | 0 |
| K41 | `=IFERROR(SUM(K35:K39)-K34+K33,0)` | 0 |
| N41 | `=IFERROR(SUM(N35:N39)-N34+N33,0)` | 0 |
| Q41 | `=IFERROR(SUM(Q35:Q39)-Q34+Q33,0)` | 0 |
| E42 | `=IF(MONTH(H30)=MONTH(H31),((YEAR(H31)-YEAR(H30))*12)-12+(12-MONTH(H30))+MONTH(H31)-1+(EOMONTH(H30,0)-H30+1)/DAY(EOMONTH(H30,0))+(1-(EOMONTH(H31,0)-H31)/DAY(EOMONTH(H31,0))),((YEAR(H31)-YEAR(H30))*12)-12+(12-MONTH(H30))+MONTH(H31)-1+(EOMONTH(H30,0)-H30+1)/DAY(EOMONTH(H30,0))+(1-(EOMONTH(H31,0)-H31)/DAY(EOMONTH(H31,0))))` | 0.032258064516129004 |
| F42 | `=ROUND(IF(AND(H30<>"",H31<>""),IF(E42<=1,1,E42),0),2)` | 0 |
| H42 | `=IFERROR(H41/F42,0)` | 0 |
| K42 | `=IFERROR(K41/F39,0)` | 0 |
| N42 | `=IFERROR(N41/F38,0)` | 0 |
| Q42 | `=IFERROR(Q41/F37,0)` | 0 |
| G45 | `=IF(OR(SAM!D47=0,SAM!D47=""),"",SAM!D47)` |  |
| E56 | `=IF(MONTH(Q49)=MONTH(Q50),((YEAR(Q50)-YEAR(Q49))*12)-12+(12-MONTH(Q49))+MONTH(Q50)-1+(EOMONTH(Q49,0)-Q49+1)/DAY(EOMONTH(Q49,0))+(1-(EOMONTH(Q50,0)-Q50)/DAY(EOMONTH(Q50,0))),((YEAR(Q50)-YEAR(Q49))*12)-12+(12-MONTH(Q49))+MONTH(Q50)-1+(EOMONTH(Q49,0)-Q49+1)/DAY(EOMONTH(Q49,0))+(1-(EOMONTH(Q50,0)-Q50)/DAY(EOMONTH(Q50,0))))` | 0.032258064516129004 |
| F56 | `=ROUND(IF(AND(Q49<>"",Q50<>""),IF(E56<=1,1,E56),0),2)` | 0 |
| E57 | `=IF(MONTH(N49)=MONTH(N50),((YEAR(N50)-YEAR(N49))*12)-12+(12-MONTH(N49))+MONTH(N50)-1+(EOMONTH(N49,0)-N49+1)/DAY(EOMONTH(N49,0))+(1-(EOMONTH(N50,0)-N50)/DAY(EOMONTH(N50,0))),((YEAR(N50)-YEAR(N49))*12)-12+(12-MONTH(N49))+MONTH(N50)-1+(EOMONTH(N49,0)-N49+1)/DAY(EOMONTH(N49,0))+(1-(EOMONTH(N50,0)-N50)/DAY(EOMONTH(N50,0))))` | 0.032258064516129004 |
| F57 | `=ROUND(IF(AND(N49<>"",N50<>""),IF(E57<=1,1,E57),0),2)` | 0 |
| E58 | `=IF(MONTH(K49)=MONTH(K50),((YEAR(K50)-YEAR(K49))*12)-12+(12-MONTH(K49))+MONTH(K50)-1+(EOMONTH(K49,0)-K49+1)/DAY(EOMONTH(K49,0))+(1-(EOMONTH(K50,0)-K50)/DAY(EOMONTH(K50,0))),((YEAR(K50)-YEAR(K49))*12)-12+(12-MONTH(K49))+MONTH(K50)-1+(EOMONTH(K49,0)-K49+1)/DAY(EOMONTH(K49,0))+(1-(EOMONTH(K50,0)-K50)/DAY(EOMONTH(K50,0))))` | 0.032258064516129004 |
| F58 | `=ROUND(IF(AND(K49<>"",K50<>""),IF(E58<=1,1,E58),0),2)` | 0 |
| H60 | `=IFERROR(SUM(H54:H58)-H53+H52,0)` | 0 |
| K60 | `=IFERROR(SUM(K54:K58)-K53+K52,0)` | 0 |
| N60 | `=IFERROR(SUM(N54:N58)-N53+N52,0)` | 0 |
| Q60 | `=IFERROR(SUM(Q54:Q58)-Q53+Q52,0)` | 0 |
| E61 | `=IF(MONTH(H49)=MONTH(H50),((YEAR(H50)-YEAR(H49))*12)-12+(12-MONTH(H49))+MONTH(H50)-1+(EOMONTH(H49,0)-H49+1)/DAY(EOMONTH(H49,0))+(1-(EOMONTH(H50,0)-H50)/DAY(EOMONTH(H50,0))),((YEAR(H50)-YEAR(H49))*12)-12+(12-MONTH(H49))+MONTH(H50)-1+(EOMONTH(H49,0)-H49+1)/DAY(EOMONTH(H49,0))+(1-(EOMONTH(H50,0)-H50)/DAY(EOMONTH(H50,0))))` | 0.032258064516129004 |
| F61 | `=ROUND(IF(AND(H49<>"",H50<>""),IF(E61<=1,1,E61),0),2)` | 0 |
| H61 | `=IFERROR(H60/F61,0)` | 0 |
| K61 | `=IFERROR(K60/F58,0)` | 0 |
| N61 | `=IFERROR(N60/F57,0)` | 0 |
| Q61 | `=IFERROR(Q60/F56,0)` | 0 |
| G66 | `=IF(OR(SAM!D65=0,SAM!D65=""),"",SAM!D65)` |  |
| E77 | `=IF(MONTH(Q70)=MONTH(Q71),((YEAR(Q71)-YEAR(Q70))*12)-12+(12-MONTH(Q70))+MONTH(Q71)-1+(EOMONTH(Q70,0)-Q70+1)/DAY(EOMONTH(Q70,0))+(1-(EOMONTH(Q71,0)-Q71)/DAY(EOMONTH(Q71,0))),((YEAR(Q71)-YEAR(Q70))*12)-12+(12-MONTH(Q70))+MONTH(Q71)-1+(EOMONTH(Q70,0)-Q70+1)/DAY(EOMONTH(Q70,0))+(1-(EOMONTH(Q71,0)-Q71)/DAY(EOMONTH(Q71,0))))` | 0.032258064516129004 |
| F77 | `=ROUND(IF(AND(Q70<>"",Q71<>""),IF(E77<=1,1,E77),0),2)` | 0 |
| E78 | `=IF(MONTH(N70)=MONTH(N71),((YEAR(N71)-YEAR(N70))*12)-12+(12-MONTH(N70))+MONTH(N71)-1+(EOMONTH(N70,0)-N70+1)/DAY(EOMONTH(N70,0))+(1-(EOMONTH(N71,0)-N71)/DAY(EOMONTH(N71,0))),((YEAR(N71)-YEAR(N70))*12)-12+(12-MONTH(N70))+MONTH(N71)-1+(EOMONTH(N70,0)-N70+1)/DAY(EOMONTH(N70,0))+(1-(EOMONTH(N71,0)-N71)/DAY(EOMONTH(N71,0))))` | 0.032258064516129004 |
| F78 | `=ROUND(IF(AND(N70<>"",N71<>""),IF(E78<=1,1,E78),0),2)` | 0 |
| E79 | `=IF(MONTH(K70)=MONTH(K71),((YEAR(K71)-YEAR(K70))*12)-12+(12-MONTH(K70))+MONTH(K71)-1+(EOMONTH(K70,0)-K70+1)/DAY(EOMONTH(K70,0))+(1-(EOMONTH(K71,0)-K71)/DAY(EOMONTH(K71,0))),((YEAR(K71)-YEAR(K70))*12)-12+(12-MONTH(K70))+MONTH(K71)-1+(EOMONTH(K70,0)-K70+1)/DAY(EOMONTH(K70,0))+(1-(EOMONTH(K71,0)-K71)/DAY(EOMONTH(K71,0))))` | 0.032258064516129004 |
| F79 | `=ROUND(IF(AND(K70<>"",K71<>""),IF(E79<=1,1,E79),0),2)` | 0 |
| H81 | `=IFERROR(SUM(H75:H79)-H74+H73,0)` | 0 |
| K81 | `=IFERROR(SUM(K75:K79)-K74+K73,0)` | 0 |
| N81 | `=IFERROR(SUM(N75:N79)-N74+N73,0)` | 0 |
| Q81 | `=IFERROR(SUM(Q75:Q79)-Q74+Q73,0)` | 0 |
| E82 | `=IF(MONTH(H70)=MONTH(H71),((YEAR(H71)-YEAR(H70))*12)-12+(12-MONTH(H70))+MONTH(H71)-1+(EOMONTH(H70,0)-H70+1)/DAY(EOMONTH(H70,0))+(1-(EOMONTH(H71,0)-H71)/DAY(EOMONTH(H71,0))),((YEAR(H71)-YEAR(H70))*12)-12+(12-MONTH(H70))+MONTH(H71)-1+(EOMONTH(H70,0)-H70+1)/DAY(EOMONTH(H70,0))+(1-(EOMONTH(H71,0)-H71)/DAY(EOMONTH(H71,0))))` | 0.032258064516129004 |
| F82 | `=ROUND(IF(AND(H70<>"",H71<>""),IF(E82<=1,1,E82),0),2)` | 0 |
| H82 | `=IFERROR(H81/F82,0)` | 0 |
| K82 | `=IFERROR(K81/F79,0)` | 0 |
| N82 | `=IFERROR(N81/F78,0)` | 0 |
| Q82 | `=IFERROR(Q81/F77,0)` | 0 |
| G87 | `=IF(OR(SAM!E113=0,SAM!E113=""),"",SAM!E113)` |  |
| E98 | `=IF(MONTH(Q91)=MONTH(Q92),((YEAR(Q92)-YEAR(Q91))*12)-12+(12-MONTH(Q91))+MONTH(Q92)-1+(EOMONTH(Q91,0)-Q91+1)/DAY(EOMONTH(Q91,0))+(1-(EOMONTH(Q92,0)-Q92)/DAY(EOMONTH(Q92,0))),((YEAR(Q92)-YEAR(Q91))*12)-12+(12-MONTH(Q91))+MONTH(Q92)-1+(EOMONTH(Q91,0)-Q91+1)/DAY(EOMONTH(Q91,0))+(1-(EOMONTH(Q92,0)-Q92)/DAY(EOMONTH(Q92,0))))` | 0.032258064516129004 |
| F98 | `=ROUND(IF(AND(Q91<>"",Q92<>""),IF(E98<=1,1,E98),0),2)` | 0 |
| E99 | `=IF(MONTH(N91)=MONTH(N92),((YEAR(N92)-YEAR(N91))*12)-12+(12-MONTH(N91))+MONTH(N92)-1+(EOMONTH(N91,0)-N91+1)/DAY(EOMONTH(N91,0))+(1-(EOMONTH(N92,0)-N92)/DAY(EOMONTH(N92,0))),((YEAR(N92)-YEAR(N91))*12)-12+(12-MONTH(N91))+MONTH(N92)-1+(EOMONTH(N91,0)-N91+1)/DAY(EOMONTH(N91,0))+(1-(EOMONTH(N92,0)-N92)/DAY(EOMONTH(N92,0))))` | 0.032258064516129004 |
| F99 | `=ROUND(IF(AND(N91<>"",N92<>""),IF(E99<=1,1,E99),0),2)` | 0 |
| E100 | `=IF(MONTH(K91)=MONTH(K92),((YEAR(K92)-YEAR(K91))*12)-12+(12-MONTH(K91))+MONTH(K92)-1+(EOMONTH(K91,0)-K91+1)/DAY(EOMONTH(K91,0))+(1-(EOMONTH(K92,0)-K92)/DAY(EOMONTH(K92,0))),((YEAR(K92)-YEAR(K91))*12)-12+(12-MONTH(K91))+MONTH(K92)-1+(EOMONTH(K91,0)-K91+1)/DAY(EOMONTH(K91,0))+(1-(EOMONTH(K92,0)-K92)/DAY(EOMONTH(K92,0))))` | 0.032258064516129004 |
| F100 | `=ROUND(IF(AND(K91<>"",K92<>""),IF(E100<=1,1,E100),0),2)` | 0 |
| H102 | `=IFERROR(SUM(H96:H100)-H95+H94,0)` | 0 |
| K102 | `=IFERROR(SUM(K96:K100)-K95+K94,0)` | 0 |
| N102 | `=IFERROR(SUM(N96:N100)-N95+N94,0)` | 0 |
| Q102 | `=IFERROR(SUM(Q96:Q100)-Q95+Q94,0)` | 0 |
| H104 | `=ROUND(IFERROR(H102*H103,0),2)` | 0 |
| K104 | `=ROUND(IFERROR(K102*K103,0),2)` | 0 |
| N104 | `=ROUND(IFERROR(N102*N103,0),2)` | 0 |
| Q104 | `=ROUND(IFERROR(Q102*Q103,0),2)` | 0 |
| H109 | `=IFERROR(H104+H106+H107,0)` | 0 |
| K109 | `=IFERROR(K104+K106+K107,0)` | 0 |
| N109 | `=IFERROR(N104+N106+N107,0)` | 0 |
| Q109 | `=IFERROR(Q104+Q106+Q107,0)` | 0 |
| E110 | `=IF(MONTH(H91)=MONTH(H92),((YEAR(H92)-YEAR(H91))*12)-12+(12-MONTH(H91))+MONTH(H92)-1+(EOMONTH(H91,0)-H91+1)/DAY(EOMONTH(H91,0))+(1-(EOMONTH(H92,0)-H92)/DAY(EOMONTH(H92,0))),((YEAR(H92)-YEAR(H91))*12)-12+(12-MONTH(H91))+MONTH(H92)-1+(EOMONTH(H91,0)-H91+1)/DAY(EOMONTH(H91,0))+(1-(EOMONTH(H92,0)-H92)/DAY(EOMONTH(H92,0))))` | 0.032258064516129004 |
| F110 | `=ROUND(IF(AND(H91<>"",H92<>""),IF(E110<=1,1,E110),0),2)` | 0 |
| H110 | `=ROUND(IFERROR(H109/F110,0),2)` | 0 |
| K110 | `=ROUND(IFERROR(K109/F100,0),2)` | 0 |
| N110 | `=ROUND(IFERROR(N109/F99,0),2)` | 0 |
| Q110 | `=ROUND(IFERROR(Q109/F98,0),2)` | 0 |
| G113 | `=IF(OR(SAM!E145=0,SAM!E145=""),"",SAM!E145)` |  |
| E124 | `=IF(MONTH(Q117)=MONTH(Q118),((YEAR(Q118)-YEAR(Q117))*12)-12+(12-MONTH(Q117))+MONTH(Q118)-1+(EOMONTH(Q117,0)-Q117+1)/DAY(EOMONTH(Q117,0))+(1-(EOMONTH(Q118,0)-Q118)/DAY(EOMONTH(Q118,0))),((YEAR(Q118)-YEAR(Q117))*12)-12+(12-MONTH(Q117))+MONTH(Q118)-1+(EOMONTH(Q117,0)-Q117+1)/DAY(EOMONTH(Q117,0))+(1-(EOMONTH(Q118,0)-Q118)/DAY(EOMONTH(Q118,0))))` | 0.032258064516129004 |
| F124 | `=ROUND(IF(AND(Q117<>"",Q118<>""),IF(E124<=1,1,E124),0),2)` | 0 |
| E125 | `=IF(MONTH(N117)=MONTH(N118),((YEAR(N118)-YEAR(N117))*12)-12+(12-MONTH(N117))+MONTH(N118)-1+(EOMONTH(N117,0)-N117+1)/DAY(EOMONTH(N117,0))+(1-(EOMONTH(N118,0)-N118)/DAY(EOMONTH(N118,0))),((YEAR(N118)-YEAR(N117))*12)-12+(12-MONTH(N117))+MONTH(N118)-1+(EOMONTH(N117,0)-N117+1)/DAY(EOMONTH(N117,0))+(1-(EOMONTH(N118,0)-N118)/DAY(EOMONTH(N118,0))))` | 0.032258064516129004 |
| F125 | `=ROUND(IF(AND(N117<>"",N118<>""),IF(E125<=1,1,E125),0),2)` | 0 |
| E126 | `=IF(MONTH(K117)=MONTH(K118),((YEAR(K118)-YEAR(K117))*12)-12+(12-MONTH(K117))+MONTH(K118)-1+(EOMONTH(K117,0)-K117+1)/DAY(EOMONTH(K117,0))+(1-(EOMONTH(K118,0)-K118)/DAY(EOMONTH(K118,0))),((YEAR(K118)-YEAR(K117))*12)-12+(12-MONTH(K117))+MONTH(K118)-1+(EOMONTH(K117,0)-K117+1)/DAY(EOMONTH(K117,0))+(1-(EOMONTH(K118,0)-K118)/DAY(EOMONTH(K118,0))))` | 0.032258064516129004 |
| F126 | `=ROUND(IF(AND(K117<>"",K118<>""),IF(E126<=1,1,E126),0),2)` | 0 |
| H128 | `=IFERROR(SUM(H122:H126)-H121+H120,0)` | 0 |
| K128 | `=IFERROR(SUM(K122:K126)-K121+K120,0)` | 0 |
| N128 | `=IFERROR(SUM(N122:N126)-N121+N120,0)` | 0 |
| Q128 | `=IFERROR(SUM(Q122:Q126)-Q121+Q120,0)` | 0 |
| H130 | `=ROUND(IFERROR(H128*H129,0),2)` | 0 |
| K130 | `=ROUND(IFERROR(K128*K129,0),2)` | 0 |
| N130 | `=ROUND(IFERROR(N128*N129,0),2)` | 0 |
| Q130 | `=ROUND(IFERROR(Q128*Q129,0),2)` | 0 |
| H135 | `=IFERROR(H130+H132+H133,0)` | 0 |
| K135 | `=IFERROR(K130+K132+K133,0)` | 0 |
| N135 | `=IFERROR(N130+N132+N133,0)` | 0 |
| Q135 | `=IFERROR(Q130+Q132+Q133,0)` | 0 |
| E136 | `=IF(MONTH(H117)=MONTH(H118),((YEAR(H118)-YEAR(H117))*12)-12+(12-MONTH(H117))+MONTH(H118)-1+(EOMONTH(H117,0)-H117+1)/DAY(EOMONTH(H117,0))+(1-(EOMONTH(H118,0)-H118)/DAY(EOMONTH(H118,0))),((YEAR(H118)-YEAR(H117))*12)-12+(12-MONTH(H117))+MONTH(H118)-1+(EOMONTH(H117,0)-H117+1)/DAY(EOMONTH(H117,0))+(1-(EOMONTH(H118,0)-H118)/DAY(EOMONTH(H118,0))))` | 0.032258064516129004 |
| F136 | `=ROUND(IF(AND(H117<>"",H118<>""),IF(E136<=1,1,E136),0),2)` | 0 |
| H136 | `=ROUND(IFERROR(H135/F136,0),2)` | 0 |
| K136 | `=ROUND(IFERROR(K135/F126,0),2)` | 0 |
| N136 | `=ROUND(IFERROR(N135/F125,0),2)` | 0 |
| Q136 | `=ROUND(IFERROR(Q135/F124,0),2)` | 0 |
| G139 | `=IF(OR(SAM!E177=0,SAM!E177=""),"",SAM!E177)` |  |
| E150 | `=IF(MONTH(Q143)=MONTH(Q144),((YEAR(Q144)-YEAR(Q143))*12)-12+(12-MONTH(Q143))+MONTH(Q144)-1+(EOMONTH(Q143,0)-Q143+1)/DAY(EOMONTH(Q143,0))+(1-(EOMONTH(Q144,0)-Q144)/DAY(EOMONTH(Q144,0))),((YEAR(Q144)-YEAR(Q143))*12)-12+(12-MONTH(Q143))+MONTH(Q144)-1+(EOMONTH(Q143,0)-Q143+1)/DAY(EOMONTH(Q143,0))+(1-(EOMONTH(Q144,0)-Q144)/DAY(EOMONTH(Q144,0))))` | 0.032258064516129004 |
| F150 | `=ROUND(IF(AND(Q143<>"",Q144<>""),IF(E150<=1,1,E150),0),2)` | 0 |
| E151 | `=IF(MONTH(N143)=MONTH(N144),((YEAR(N144)-YEAR(N143))*12)-12+(12-MONTH(N143))+MONTH(N144)-1+(EOMONTH(N143,0)-N143+1)/DAY(EOMONTH(N143,0))+(1-(EOMONTH(N144,0)-N144)/DAY(EOMONTH(N144,0))),((YEAR(N144)-YEAR(N143))*12)-12+(12-MONTH(N143))+MONTH(N144)-1+(EOMONTH(N143,0)-N143+1)/DAY(EOMONTH(N143,0))+(1-(EOMONTH(N144,0)-N144)/DAY(EOMONTH(N144,0))))` | 0.032258064516129004 |
| F151 | `=ROUND(IF(AND(N143<>"",N144<>""),IF(E151<=1,1,E151),0),2)` | 0 |
| E152 | `=IF(MONTH(K143)=MONTH(K144),((YEAR(K144)-YEAR(K143))*12)-12+(12-MONTH(K143))+MONTH(K144)-1+(EOMONTH(K143,0)-K143+1)/DAY(EOMONTH(K143,0))+(1-(EOMONTH(K144,0)-K144)/DAY(EOMONTH(K144,0))),((YEAR(K144)-YEAR(K143))*12)-12+(12-MONTH(K143))+MONTH(K144)-1+(EOMONTH(K143,0)-K143+1)/DAY(EOMONTH(K143,0))+(1-(EOMONTH(K144,0)-K144)/DAY(EOMONTH(K144,0))))` | 0.032258064516129004 |
| F152 | `=ROUND(IF(AND(K143<>"",K144<>""),IF(E152<=1,1,E152),0),2)` | 0 |
| H154 | `=IFERROR(SUM(H148:H152)-H147+H146,0)` | 0 |
| K154 | `=IFERROR(SUM(K148:K152)-K147+K146,0)` | 0 |
| N154 | `=IFERROR(SUM(N148:N152)-N147+N146,0)` | 0 |
| Q154 | `=IFERROR(SUM(Q148:Q152)-Q147+Q146,0)` | 0 |
| H156 | `=ROUND(IFERROR(H154*H155,0),2)` | 0 |
| K156 | `=ROUND(IFERROR(K154*K155,0),2)` | 0 |
| N156 | `=ROUND(IFERROR(N154*N155,0),2)` | 0 |
| Q156 | `=ROUND(IFERROR(Q154*Q155,0),2)` | 0 |
| H161 | `=IFERROR(H156+H158+H159,0)` | 0 |
| K161 | `=IFERROR(K156+K158+K159,0)` | 0 |
| N161 | `=IFERROR(N156+N158+N159,0)` | 0 |
| Q161 | `=IFERROR(Q156+Q158+Q159,0)` | 0 |
| E162 | `=IF(MONTH(H143)=MONTH(H144),((YEAR(H144)-YEAR(H143))*12)-12+(12-MONTH(H143))+MONTH(H144)-1+(EOMONTH(H143,0)-H143+1)/DAY(EOMONTH(H143,0))+(1-(EOMONTH(H144,0)-H144)/DAY(EOMONTH(H144,0))),((YEAR(H144)-YEAR(H143))*12)-12+(12-MONTH(H143))+MONTH(H144)-1+(EOMONTH(H143,0)-H143+1)/DAY(EOMONTH(H143,0))+(1-(EOMONTH(H144,0)-H144)/DAY(EOMONTH(H144,0))))` | 0.032258064516129004 |
| F162 | `=ROUND(IF(AND(H143<>"",H144<>""),IF(E162<=1,1,E162),0),2)` | 0 |
| H162 | `=ROUND(IFERROR(H161/F162,0),2)` | 0 |
| K162 | `=ROUND(IFERROR(K161/F152,0),2)` | 0 |
| N162 | `=ROUND(IFERROR(N161/F151,0),2)` | 0 |
| Q162 | `=ROUND(IFERROR(Q161/F150,0),2)` | 0 |
| G165 | `=IF(OR(SAM!E209=0,SAM!E209=""),"",SAM!E209)` |  |
| E176 | `=IF(MONTH(Q169)=MONTH(Q170),((YEAR(Q170)-YEAR(Q169))*12)-12+(12-MONTH(Q169))+MONTH(Q170)-1+(EOMONTH(Q169,0)-Q169+1)/DAY(EOMONTH(Q169,0))+(1-(EOMONTH(Q170,0)-Q170)/DAY(EOMONTH(Q170,0))),((YEAR(Q170)-YEAR(Q169))*12)-12+(12-MONTH(Q169))+MONTH(Q170)-1+(EOMONTH(Q169,0)-Q169+1)/DAY(EOMONTH(Q169,0))+(1-(EOMONTH(Q170,0)-Q170)/DAY(EOMONTH(Q170,0))))` | 0.032258064516129004 |
| F176 | `=ROUND(IF(AND(Q169<>"",Q170<>""),IF(E176<=1,1,E176),0),2)` | 0 |
| E177 | `=IF(MONTH(N169)=MONTH(N170),((YEAR(N170)-YEAR(N169))*12)-12+(12-MONTH(N169))+MONTH(N170)-1+(EOMONTH(N169,0)-N169+1)/DAY(EOMONTH(N169,0))+(1-(EOMONTH(N170,0)-N170)/DAY(EOMONTH(N170,0))),((YEAR(N170)-YEAR(N169))*12)-12+(12-MONTH(N169))+MONTH(N170)-1+(EOMONTH(N169,0)-N169+1)/DAY(EOMONTH(N169,0))+(1-(EOMONTH(N170,0)-N170)/DAY(EOMONTH(N170,0))))` | 0.032258064516129004 |
| F177 | `=ROUND(IF(AND(N169<>"",N170<>""),IF(E177<=1,1,E177),0),2)` | 0 |
| E178 | `=IF(MONTH(K169)=MONTH(K170),((YEAR(K170)-YEAR(K169))*12)-12+(12-MONTH(K169))+MONTH(K170)-1+(EOMONTH(K169,0)-K169+1)/DAY(EOMONTH(K169,0))+(1-(EOMONTH(K170,0)-K170)/DAY(EOMONTH(K170,0))),((YEAR(K170)-YEAR(K169))*12)-12+(12-MONTH(K169))+MONTH(K170)-1+(EOMONTH(K169,0)-K169+1)/DAY(EOMONTH(K169,0))+(1-(EOMONTH(K170,0)-K170)/DAY(EOMONTH(K170,0))))` | 0.032258064516129004 |
| F178 | `=ROUND(IF(AND(K169<>"",K170<>""),IF(E178<=1,1,E178),0),2)` | 0 |
| H180 | `=IFERROR(SUM(H174:H178)-H173+H172,0)` | 0 |
| K180 | `=IFERROR(SUM(K174:K178)-K173+K172,0)` | 0 |
| N180 | `=IFERROR(SUM(N174:N178)-N173+N172,0)` | 0 |
| Q180 | `=IFERROR(SUM(Q174:Q178)-Q173+Q172,0)` | 0 |
| H182 | `=ROUND(IFERROR(H180*H181,0),2)` | 0 |
| K182 | `=ROUND(IFERROR(K180*K181,0),2)` | 0 |
| N182 | `=ROUND(IFERROR(N180*N181,0),2)` | 0 |
| Q182 | `=ROUND(IFERROR(Q180*Q181,0),2)` | 0 |
| H187 | `=IFERROR(H182+H184+H185,0)` | 0 |
| K187 | `=IFERROR(K182+K184+K185,0)` | 0 |
| N187 | `=IFERROR(N182+N184+N185,0)` | 0 |
| Q187 | `=IFERROR(Q182+Q184+Q185,0)` | 0 |
| E188 | `=IF(MONTH(H169)=MONTH(H170),((YEAR(H170)-YEAR(H169))*12)-12+(12-MONTH(H169))+MONTH(H170)-1+(EOMONTH(H169,0)-H169+1)/DAY(EOMONTH(H169,0))+(1-(EOMONTH(H170,0)-H170)/DAY(EOMONTH(H170,0))),((YEAR(H170)-YEAR(H169))*12)-12+(12-MONTH(H169))+MONTH(H170)-1+(EOMONTH(H169,0)-H169+1)/DAY(EOMONTH(H169,0))+(1-(EOMONTH(H170,0)-H170)/DAY(EOMONTH(H170,0))))` | 0.032258064516129004 |
| F188 | `=ROUND(IF(AND(H169<>"",H170<>""),IF(E188<=1,1,E188),0),2)` | 0 |
| H188 | `=ROUND(IFERROR(H187/F188,0),2)` | 0 |
| K188 | `=ROUND(IFERROR(K187/F178,0),2)` | 0 |
| N188 | `=ROUND(IFERROR(N187/F177,0),2)` | 0 |
| Q188 | `=ROUND(IFERROR(Q187/F176,0),2)` | 0 |
| G193 | `=IF(OR(SAM!E243=0,SAM!E243=""),"",SAM!E243)` |  |
| E204 | `=IF(MONTH(Q197)=MONTH(Q198),((YEAR(Q198)-YEAR(Q197))*12)-12+(12-MONTH(Q197))+MONTH(Q198)-1+(EOMONTH(Q197,0)-Q197+1)/DAY(EOMONTH(Q197,0))+(1-(EOMONTH(Q198,0)-Q198)/DAY(EOMONTH(Q198,0))),((YEAR(Q198)-YEAR(Q197))*12)-12+(12-MONTH(Q197))+MONTH(Q198)-1+(EOMONTH(Q197,0)-Q197+1)/DAY(EOMONTH(Q197,0))+(1-(EOMONTH(Q198,0)-Q198)/DAY(EOMONTH(Q198,0))))` | 0.032258064516129004 |
| F204 | `=ROUND(IF(AND(Q197<>"",Q198<>""),IF(E204<=1,1,E204),0),2)` | 0 |
| E205 | `=IF(MONTH(N197)=MONTH(N198),((YEAR(N198)-YEAR(N197))*12)-12+(12-MONTH(N197))+MONTH(N198)-1+(EOMONTH(N197,0)-N197+1)/DAY(EOMONTH(N197,0))+(1-(EOMONTH(N198,0)-N198)/DAY(EOMONTH(N198,0))),((YEAR(N198)-YEAR(N197))*12)-12+(12-MONTH(N197))+MONTH(N198)-1+(EOMONTH(N197,0)-N197+1)/DAY(EOMONTH(N197,0))+(1-(EOMONTH(N198,0)-N198)/DAY(EOMONTH(N198,0))))` | 0.032258064516129004 |
| F205 | `=ROUND(IF(AND(N197<>"",N198<>""),IF(E205<=1,1,E205),0),2)` | 0 |
| E206 | `=IF(MONTH(K197)=MONTH(K198),((YEAR(K198)-YEAR(K197))*12)-12+(12-MONTH(K197))+MONTH(K198)-1+(EOMONTH(K197,0)-K197+1)/DAY(EOMONTH(K197,0))+(1-(EOMONTH(K198,0)-K198)/DAY(EOMONTH(K198,0))),((YEAR(K198)-YEAR(K197))*12)-12+(12-MONTH(K197))+MONTH(K198)-1+(EOMONTH(K197,0)-K197+1)/DAY(EOMONTH(K197,0))+(1-(EOMONTH(K198,0)-K198)/DAY(EOMONTH(K198,0))))` | 0.032258064516129004 |
| F206 | `=ROUND(IF(AND(K197<>"",K198<>""),IF(E206<=1,1,E206),0),2)` | 0 |
| H208 | `=IFERROR(SUM(H202:H206)-H201+H200,0)` | 0 |
| K208 | `=IFERROR(SUM(K202:K206)-K201+K200,0)` | 0 |
| N208 | `=IFERROR(SUM(N202:N206)-N201+N200,0)` | 0 |
| Q208 | `=IFERROR(SUM(Q202:Q206)-Q201+Q200,0)` | 0 |
| H210 | `=ROUND(IFERROR(H208*H209,0),2)` | 0 |
| K210 | `=ROUND(IFERROR(K208*K209,0),2)` | 0 |
| N210 | `=ROUND(IFERROR(N208*N209,0),2)` | 0 |
| Q210 | `=ROUND(IFERROR(Q208*Q209,0),2)` | 0 |
| H214 | `=IFERROR(H210+H212,0)` | 0 |
| K214 | `=IFERROR(K210+K212,0)` | 0 |
| N214 | `=IFERROR(N210+N212,0)` | 0 |
| Q214 | `=IFERROR(Q210+Q212,0)` | 0 |
| E215 | `=IF(MONTH(H197)=MONTH(H198),((YEAR(H198)-YEAR(H197))*12)-12+(12-MONTH(H197))+MONTH(H198)-1+(EOMONTH(H197,0)-H197+1)/DAY(EOMONTH(H197,0))+(1-(EOMONTH(H198,0)-H198)/DAY(EOMONTH(H198,0))),((YEAR(H198)-YEAR(H197))*12)-12+(12-MONTH(H197))+MONTH(H198)-1+(EOMONTH(H197,0)-H197+1)/DAY(EOMONTH(H197,0))+(1-(EOMONTH(H198,0)-H198)/DAY(EOMONTH(H198,0))))` | 0.032258064516129004 |
| F215 | `=ROUND(IF(AND(H197<>"",H198<>""),IF(E215<=1,1,E215),0),2)` | 0 |
| H215 | `=ROUND(IFERROR(H214/F215,0),2)` | 0 |
| K215 | `=ROUND(IFERROR(K214/F206,0),2)` | 0 |
| N215 | `=ROUND(IFERROR(N214/F205,0),2)` | 0 |
| Q215 | `=ROUND(IFERROR(Q214/F204,0),2)` | 0 |
| G218 | `=IF(OR(SAM!E273=0,SAM!E273=""),"",SAM!E273)` |  |
| E229 | `=IF(MONTH(Q222)=MONTH(Q223),((YEAR(Q223)-YEAR(Q222))*12)-12+(12-MONTH(Q222))+MONTH(Q223)-1+(EOMONTH(Q222,0)-Q222+1)/DAY(EOMONTH(Q222,0))+(1-(EOMONTH(Q223,0)-Q223)/DAY(EOMONTH(Q223,0))),((YEAR(Q223)-YEAR(Q222))*12)-12+(12-MONTH(Q222))+MONTH(Q223)-1+(EOMONTH(Q222,0)-Q222+1)/DAY(EOMONTH(Q222,0))+(1-(EOMONTH(Q223,0)-Q223)/DAY(EOMONTH(Q223,0))))` | 0.032258064516129004 |
| F229 | `=ROUND(IF(AND(Q222<>"",Q223<>""),IF(E229<=1,1,E229),0),2)` | 0 |
| E230 | `=IF(MONTH(N222)=MONTH(N223),((YEAR(N223)-YEAR(N222))*12)-12+(12-MONTH(N222))+MONTH(N223)-1+(EOMONTH(N222,0)-N222+1)/DAY(EOMONTH(N222,0))+(1-(EOMONTH(N223,0)-N223)/DAY(EOMONTH(N223,0))),((YEAR(N223)-YEAR(N222))*12)-12+(12-MONTH(N222))+MONTH(N223)-1+(EOMONTH(N222,0)-N222+1)/DAY(EOMONTH(N222,0))+(1-(EOMONTH(N223,0)-N223)/DAY(EOMONTH(N223,0))))` | 0.032258064516129004 |
| F230 | `=ROUND(IF(AND(N222<>"",N223<>""),IF(E230<=1,1,E230),0),2)` | 0 |
| E231 | `=IF(MONTH(K222)=MONTH(K223),((YEAR(K223)-YEAR(K222))*12)-12+(12-MONTH(K222))+MONTH(K223)-1+(EOMONTH(K222,0)-K222+1)/DAY(EOMONTH(K222,0))+(1-(EOMONTH(K223,0)-K223)/DAY(EOMONTH(K223,0))),((YEAR(K223)-YEAR(K222))*12)-12+(12-MONTH(K222))+MONTH(K223)-1+(EOMONTH(K222,0)-K222+1)/DAY(EOMONTH(K222,0))+(1-(EOMONTH(K223,0)-K223)/DAY(EOMONTH(K223,0))))` | 0.032258064516129004 |
| F231 | `=ROUND(IF(AND(K222<>"",K223<>""),IF(E231<=1,1,E231),0),2)` | 0 |
| H233 | `=IFERROR(SUM(H227:H231)-H226+H225,0)` | 0 |
| K233 | `=IFERROR(SUM(K227:K231)-K226+K225,0)` | 0 |
| N233 | `=IFERROR(SUM(N227:N231)-N226+N225,0)` | 0 |
| Q233 | `=IFERROR(SUM(Q227:Q231)-Q226+Q225,0)` | 0 |
| H235 | `=ROUND(IFERROR(H233*H234,0),2)` | 0 |
| K235 | `=ROUND(IFERROR(K233*K234,0),2)` | 0 |
| N235 | `=ROUND(IFERROR(N233*N234,0),2)` | 0 |
| Q235 | `=ROUND(IFERROR(Q233*Q234,0),2)` | 0 |
| H239 | `=IFERROR(H235+H237,0)` | 0 |
| K239 | `=IFERROR(K235+K237,0)` | 0 |
| N239 | `=IFERROR(N235+N237,0)` | 0 |
| Q239 | `=IFERROR(Q235+Q237,0)` | 0 |
| E240 | `=IF(MONTH(H222)=MONTH(H223),((YEAR(H223)-YEAR(H222))*12)-12+(12-MONTH(H222))+MONTH(H223)-1+(EOMONTH(H222,0)-H222+1)/DAY(EOMONTH(H222,0))+(1-(EOMONTH(H223,0)-H223)/DAY(EOMONTH(H223,0))),((YEAR(H223)-YEAR(H222))*12)-12+(12-MONTH(H222))+MONTH(H223)-1+(EOMONTH(H222,0)-H222+1)/DAY(EOMONTH(H222,0))+(1-(EOMONTH(H223,0)-H223)/DAY(EOMONTH(H223,0))))` | 0.032258064516129004 |
| F240 | `=ROUND(IF(AND(H222<>"",H223<>""),IF(E240<=1,1,E240),0),2)` | 0 |
| H240 | `=ROUND(IFERROR(H239/F240,0),2)` | 0 |
| K240 | `=ROUND(IFERROR(K239/F231,0),2)` | 0 |
| N240 | `=ROUND(IFERROR(N239/F230,0),2)` | 0 |
| Q240 | `=ROUND(IFERROR(Q239/F229,0),2)` | 0 |
| G243 | `=IF(OR(SAM!E303=0,SAM!E303=""),"",SAM!E303)` |  |
| E254 | `=IF(MONTH(Q247)=MONTH(Q248),((YEAR(Q248)-YEAR(Q247))*12)-12+(12-MONTH(Q247))+MONTH(Q248)-1+(EOMONTH(Q247,0)-Q247+1)/DAY(EOMONTH(Q247,0))+(1-(EOMONTH(Q248,0)-Q248)/DAY(EOMONTH(Q248,0))),((YEAR(Q248)-YEAR(Q247))*12)-12+(12-MONTH(Q247))+MONTH(Q248)-1+(EOMONTH(Q247,0)-Q247+1)/DAY(EOMONTH(Q247,0))+(1-(EOMONTH(Q248,0)-Q248)/DAY(EOMONTH(Q248,0))))` | 0.032258064516129004 |
| F254 | `=ROUND(IF(AND(Q247<>"",Q248<>""),IF(E254<=1,1,E254),0),2)` | 0 |
| E255 | `=IF(MONTH(N247)=MONTH(N248),((YEAR(N248)-YEAR(N247))*12)-12+(12-MONTH(N247))+MONTH(N248)-1+(EOMONTH(N247,0)-N247+1)/DAY(EOMONTH(N247,0))+(1-(EOMONTH(N248,0)-N248)/DAY(EOMONTH(N248,0))),((YEAR(N248)-YEAR(N247))*12)-12+(12-MONTH(N247))+MONTH(N248)-1+(EOMONTH(N247,0)-N247+1)/DAY(EOMONTH(N247,0))+(1-(EOMONTH(N248,0)-N248)/DAY(EOMONTH(N248,0))))` | 0.032258064516129004 |
| F255 | `=ROUND(IF(AND(N247<>"",N248<>""),IF(E255<=1,1,E255),0),2)` | 0 |
| E256 | `=IF(MONTH(K247)=MONTH(K248),((YEAR(K248)-YEAR(K247))*12)-12+(12-MONTH(K247))+MONTH(K248)-1+(EOMONTH(K247,0)-K247+1)/DAY(EOMONTH(K247,0))+(1-(EOMONTH(K248,0)-K248)/DAY(EOMONTH(K248,0))),((YEAR(K248)-YEAR(K247))*12)-12+(12-MONTH(K247))+MONTH(K248)-1+(EOMONTH(K247,0)-K247+1)/DAY(EOMONTH(K247,0))+(1-(EOMONTH(K248,0)-K248)/DAY(EOMONTH(K248,0))))` | 0.032258064516129004 |
| F256 | `=ROUND(IF(AND(K247<>"",K248<>""),IF(E256<=1,1,E256),0),2)` | 0 |
| H258 | `=IFERROR(SUM(H252:H256)-H251+H250,0)` | 0 |
| K258 | `=IFERROR(SUM(K252:K256)-K251+K250,0)` | 0 |
| N258 | `=IFERROR(SUM(N252:N256)-N251+N250,0)` | 0 |
| Q258 | `=IFERROR(SUM(Q252:Q256)-Q251+Q250,0)` | 0 |
| H260 | `=ROUND(IFERROR(H258*H259,0),2)` | 0 |
| K260 | `=ROUND(IFERROR(K258*K259,0),2)` | 0 |
| N260 | `=ROUND(IFERROR(N258*N259,0),2)` | 0 |
| Q260 | `=ROUND(IFERROR(Q258*Q259,0),2)` | 0 |
| H264 | `=IFERROR(H260+H262,0)` | 0 |
| K264 | `=IFERROR(K260+K262,0)` | 0 |
| N264 | `=IFERROR(N260+N262,0)` | 0 |
| Q264 | `=IFERROR(Q260+Q262,0)` | 0 |
| E265 | `=IF(MONTH(H247)=MONTH(H248),((YEAR(H248)-YEAR(H247))*12)-12+(12-MONTH(H247))+MONTH(H248)-1+(EOMONTH(H247,0)-H247+1)/DAY(EOMONTH(H247,0))+(1-(EOMONTH(H248,0)-H248)/DAY(EOMONTH(H248,0))),((YEAR(H248)-YEAR(H247))*12)-12+(12-MONTH(H247))+MONTH(H248)-1+(EOMONTH(H247,0)-H247+1)/DAY(EOMONTH(H247,0))+(1-(EOMONTH(H248,0)-H248)/DAY(EOMONTH(H248,0))))` | 0.032258064516129004 |
| F265 | `=ROUND(IF(AND(H247<>"",H248<>""),IF(E265<=1,1,E265),0),2)` | 0 |
| H265 | `=ROUND(IFERROR(H264/F265,0),2)` | 0 |
| K265 | `=ROUND(IFERROR(K264/F256,0),2)` | 0 |
| N265 | `=ROUND(IFERROR(N264/F255,0),2)` | 0 |
| Q265 | `=ROUND(IFERROR(Q264/F254,0),2)` | 0 |
| G268 | `=IF(OR(SAM!E333=0,SAM!E333=""),"",SAM!E333)` |  |
| E279 | `=IF(MONTH(Q272)=MONTH(Q273),((YEAR(Q273)-YEAR(Q272))*12)-12+(12-MONTH(Q272))+MONTH(Q273)-1+(EOMONTH(Q272,0)-Q272+1)/DAY(EOMONTH(Q272,0))+(1-(EOMONTH(Q273,0)-Q273)/DAY(EOMONTH(Q273,0))),((YEAR(Q273)-YEAR(Q272))*12)-12+(12-MONTH(Q272))+MONTH(Q273)-1+(EOMONTH(Q272,0)-Q272+1)/DAY(EOMONTH(Q272,0))+(1-(EOMONTH(Q273,0)-Q273)/DAY(EOMONTH(Q273,0))))` | 0.032258064516129004 |
| F279 | `=ROUND(IF(AND(Q272<>"",Q273<>""),IF(E279<=1,1,E279),0),2)` | 0 |
| E280 | `=IF(MONTH(N272)=MONTH(N273),((YEAR(N273)-YEAR(N272))*12)-12+(12-MONTH(N272))+MONTH(N273)-1+(EOMONTH(N272,0)-N272+1)/DAY(EOMONTH(N272,0))+(1-(EOMONTH(N273,0)-N273)/DAY(EOMONTH(N273,0))),((YEAR(N273)-YEAR(N272))*12)-12+(12-MONTH(N272))+MONTH(N273)-1+(EOMONTH(N272,0)-N272+1)/DAY(EOMONTH(N272,0))+(1-(EOMONTH(N273,0)-N273)/DAY(EOMONTH(N273,0))))` | 0.032258064516129004 |
| F280 | `=ROUND(IF(AND(N272<>"",N273<>""),IF(E280<=1,1,E280),0),2)` | 0 |
| E281 | `=IF(MONTH(K272)=MONTH(K273),((YEAR(K273)-YEAR(K272))*12)-12+(12-MONTH(K272))+MONTH(K273)-1+(EOMONTH(K272,0)-K272+1)/DAY(EOMONTH(K272,0))+(1-(EOMONTH(K273,0)-K273)/DAY(EOMONTH(K273,0))),((YEAR(K273)-YEAR(K272))*12)-12+(12-MONTH(K272))+MONTH(K273)-1+(EOMONTH(K272,0)-K272+1)/DAY(EOMONTH(K272,0))+(1-(EOMONTH(K273,0)-K273)/DAY(EOMONTH(K273,0))))` | 0.032258064516129004 |
| F281 | `=ROUND(IF(AND(K272<>"",K273<>""),IF(E281<=1,1,E281),0),2)` | 0 |
| H283 | `=IFERROR(SUM(H277:H281)-H276+H275,0)` | 0 |
| K283 | `=IFERROR(SUM(K277:K281)-K276+K275,0)` | 0 |
| N283 | `=IFERROR(SUM(N277:N281)-N276+N275,0)` | 0 |
| Q283 | `=IFERROR(SUM(Q277:Q281)-Q276+Q275,0)` | 0 |
| H285 | `=ROUND(IFERROR(H283*H284,0),2)` | 0 |
| K285 | `=ROUND(IFERROR(K283*K284,0),2)` | 0 |
| N285 | `=ROUND(IFERROR(N283*N284,0),2)` | 0 |
| Q285 | `=ROUND(IFERROR(Q283*Q284,0),2)` | 0 |
| H289 | `=IFERROR(H285+H287,0)` | 0 |
| K289 | `=IFERROR(K285+K287,0)` | 0 |
| N289 | `=IFERROR(N285+N287,0)` | 0 |
| Q289 | `=IFERROR(Q285+Q287,0)` | 0 |
| E290 | `=IF(MONTH(H272)=MONTH(H273),((YEAR(H273)-YEAR(H272))*12)-12+(12-MONTH(H272))+MONTH(H273)-1+(EOMONTH(H272,0)-H272+1)/DAY(EOMONTH(H272,0))+(1-(EOMONTH(H273,0)-H273)/DAY(EOMONTH(H273,0))),((YEAR(H273)-YEAR(H272))*12)-12+(12-MONTH(H272))+MONTH(H273)-1+(EOMONTH(H272,0)-H272+1)/DAY(EOMONTH(H272,0))+(1-(EOMONTH(H273,0)-H273)/DAY(EOMONTH(H273,0))))` | 0.032258064516129004 |
| F290 | `=ROUND(IF(AND(H272<>"",H273<>""),IF(E290<=1,1,E290),0),2)` | 0 |
| H290 | `=ROUND(IFERROR(H289/F290,0),2)` | 0 |
| K290 | `=ROUND(IFERROR(K289/F281,0),2)` | 0 |
| N290 | `=ROUND(IFERROR(N289/F280,0),2)` | 0 |
| Q290 | `=ROUND(IFERROR(Q289/F279,0),2)` | 0 |
| G295 | `=IF(OR(SAM!E365=0,SAM!E365=""),"",SAM!E365)` |  |
| E307 | `=IF(MONTH(Q299)=MONTH(Q300),((YEAR(Q300)-YEAR(Q299))*12)-12+(12-MONTH(Q299))+MONTH(Q300)-1+(EOMONTH(Q299,0)-Q299+1)/DAY(EOMONTH(Q299,0))+(1-(EOMONTH(Q300,0)-Q300)/DAY(EOMONTH(Q300,0))),((YEAR(Q300)-YEAR(Q299))*12)-12+(12-MONTH(Q299))+MONTH(Q300)-1+(EOMONTH(Q299,0)-Q299+1)/DAY(EOMONTH(Q299,0))+(1-(EOMONTH(Q300,0)-Q300)/DAY(EOMONTH(Q300,0))))` | 0.032258064516129004 |
| F307 | `=ROUND(IF(AND(Q299<>"",Q300<>""),IF(E307<=1,1,E307),0),2)` | 0 |
| E308 | `=IF(MONTH(N299)=MONTH(N300),((YEAR(N300)-YEAR(N299))*12)-12+(12-MONTH(N299))+MONTH(N300)-1+(EOMONTH(N299,0)-N299+1)/DAY(EOMONTH(N299,0))+(1-(EOMONTH(N300,0)-N300)/DAY(EOMONTH(N300,0))),((YEAR(N300)-YEAR(N299))*12)-12+(12-MONTH(N299))+MONTH(N300)-1+(EOMONTH(N299,0)-N299+1)/DAY(EOMONTH(N299,0))+(1-(EOMONTH(N300,0)-N300)/DAY(EOMONTH(N300,0))))` | 0.032258064516129004 |
| F308 | `=ROUND(IF(AND(N299<>"",N300<>""),IF(E308<=1,1,E308),0),2)` | 0 |
| E309 | `=IF(MONTH(K299)=MONTH(K300),((YEAR(K300)-YEAR(K299))*12)-12+(12-MONTH(K299))+MONTH(K300)-1+(EOMONTH(K299,0)-K299+1)/DAY(EOMONTH(K299,0))+(1-(EOMONTH(K300,0)-K300)/DAY(EOMONTH(K300,0))),((YEAR(K300)-YEAR(K299))*12)-12+(12-MONTH(K299))+MONTH(K300)-1+(EOMONTH(K299,0)-K299+1)/DAY(EOMONTH(K299,0))+(1-(EOMONTH(K300,0)-K300)/DAY(EOMONTH(K300,0))))` | 0.032258064516129004 |
| F309 | `=ROUND(IF(AND(K299<>"",K300<>""),IF(E309<=1,1,E309),0),2)` | 0 |
| H311 | `=IFERROR(SUM(H305:H309)-H303-H304+H302,0)` | 0 |
| K311 | `=IFERROR(SUM(K305:K309)-K303-K304+K302,0)` | 0 |
| N311 | `=IFERROR(SUM(N305:N309)-N303-N304+N302,0)` | 0 |
| Q311 | `=IFERROR(SUM(Q305:Q309)-Q303-Q304+Q302,0)` | 0 |
| H313 | `=ROUND(IFERROR(H311*H312,0),2)` | 0 |
| K313 | `=ROUND(IFERROR(K311*K312,0),2)` | 0 |
| N313 | `=ROUND(IFERROR(N311*N312,0),2)` | 0 |
| Q313 | `=ROUND(IFERROR(Q311*Q312,0),2)` | 0 |
| H317 | `=IFERROR(H313+H315,0)` | 0 |
| K317 | `=IFERROR(K313+K315,0)` | 0 |
| N317 | `=IFERROR(N313+N315,0)` | 0 |
| Q317 | `=IFERROR(Q313+Q315,0)` | 0 |
| E318 | `=IF(MONTH(H299)=MONTH(H300),((YEAR(H300)-YEAR(H299))*12)-12+(12-MONTH(H299))+MONTH(H300)-1+(EOMONTH(H299,0)-H299+1)/DAY(EOMONTH(H299,0))+(1-(EOMONTH(H300,0)-H300)/DAY(EOMONTH(H300,0))),((YEAR(H300)-YEAR(H299))*12)-12+(12-MONTH(H299))+MONTH(H300)-1+(EOMONTH(H299,0)-H299+1)/DAY(EOMONTH(H299,0))+(1-(EOMONTH(H300,0)-H300)/DAY(EOMONTH(H300,0))))` | 0.032258064516129004 |
| F318 | `=ROUND(IF(AND(H299<>"",H300<>""),IF(E318<=1,1,E318),0),2)` | 0 |
| H318 | `=ROUND(IFERROR(H317/F318,0),2)` | 0 |
| K318 | `=ROUND(IFERROR(K317/F309,0),2)` | 0 |
| N318 | `=ROUND(IFERROR(N317/F308,0),2)` | 0 |
| Q318 | `=ROUND(IFERROR(Q317/F307,0),2)` | 0 |
| G321 | `=IF(OR(SAM!E392=0,SAM!E392=""),"",SAM!E392)` |  |
| E333 | `=IF(MONTH(Q325)=MONTH(Q326),((YEAR(Q326)-YEAR(Q325))*12)-12+(12-MONTH(Q325))+MONTH(Q326)-1+(EOMONTH(Q325,0)-Q325+1)/DAY(EOMONTH(Q325,0))+(1-(EOMONTH(Q326,0)-Q326)/DAY(EOMONTH(Q326,0))),((YEAR(Q326)-YEAR(Q325))*12)-12+(12-MONTH(Q325))+MONTH(Q326)-1+(EOMONTH(Q325,0)-Q325+1)/DAY(EOMONTH(Q325,0))+(1-(EOMONTH(Q326,0)-Q326)/DAY(EOMONTH(Q326,0))))` | 0.032258064516129004 |
| F333 | `=ROUND(IF(AND(Q325<>"",Q326<>""),IF(E333<=1,1,E333),0),2)` | 0 |
| E334 | `=IF(MONTH(N325)=MONTH(N326),((YEAR(N326)-YEAR(N325))*12)-12+(12-MONTH(N325))+MONTH(N326)-1+(EOMONTH(N325,0)-N325+1)/DAY(EOMONTH(N325,0))+(1-(EOMONTH(N326,0)-N326)/DAY(EOMONTH(N326,0))),((YEAR(N326)-YEAR(N325))*12)-12+(12-MONTH(N325))+MONTH(N326)-1+(EOMONTH(N325,0)-N325+1)/DAY(EOMONTH(N325,0))+(1-(EOMONTH(N326,0)-N326)/DAY(EOMONTH(N326,0))))` | 0.032258064516129004 |
| F334 | `=ROUND(IF(AND(N325<>"",N326<>""),IF(E334<=1,1,E334),0),2)` | 0 |
| E335 | `=IF(MONTH(K325)=MONTH(K326),((YEAR(K326)-YEAR(K325))*12)-12+(12-MONTH(K325))+MONTH(K326)-1+(EOMONTH(K325,0)-K325+1)/DAY(EOMONTH(K325,0))+(1-(EOMONTH(K326,0)-K326)/DAY(EOMONTH(K326,0))),((YEAR(K326)-YEAR(K325))*12)-12+(12-MONTH(K325))+MONTH(K326)-1+(EOMONTH(K325,0)-K325+1)/DAY(EOMONTH(K325,0))+(1-(EOMONTH(K326,0)-K326)/DAY(EOMONTH(K326,0))))` | 0.032258064516129004 |
| F335 | `=ROUND(IF(AND(K325<>"",K326<>""),IF(E335<=1,1,E335),0),2)` | 0 |
| H337 | `=IFERROR(SUM(H331:H335)-H329-H330+H328,0)` | 0 |
| K337 | `=IFERROR(SUM(K331:K335)-K329-K330+K328,0)` | 0 |
| N337 | `=IFERROR(SUM(N331:N335)-N329-N330+N328,0)` | 0 |
| Q337 | `=IFERROR(SUM(Q331:Q335)-Q329-Q330+Q328,0)` | 0 |
| H339 | `=ROUND(IFERROR(H337*H338,0),2)` | 0 |
| K339 | `=ROUND(IFERROR(K337*K338,0),2)` | 0 |
| N339 | `=ROUND(IFERROR(N337*N338,0),2)` | 0 |
| Q339 | `=ROUND(IFERROR(Q337*Q338,0),2)` | 0 |
| H343 | `=IFERROR(H339+H341,0)` | 0 |
| K343 | `=IFERROR(K339+K341,0)` | 0 |
| N343 | `=IFERROR(N339+N341,0)` | 0 |
| Q343 | `=IFERROR(Q339+Q341,0)` | 0 |
| E344 | `=IF(MONTH(H325)=MONTH(H326),((YEAR(H326)-YEAR(H325))*12)-12+(12-MONTH(H325))+MONTH(H326)-1+(EOMONTH(H325,0)-H325+1)/DAY(EOMONTH(H325,0))+(1-(EOMONTH(H326,0)-H326)/DAY(EOMONTH(H326,0))),((YEAR(H326)-YEAR(H325))*12)-12+(12-MONTH(H325))+MONTH(H326)-1+(EOMONTH(H325,0)-H325+1)/DAY(EOMONTH(H325,0))+(1-(EOMONTH(H326,0)-H326)/DAY(EOMONTH(H326,0))))` | 0.032258064516129004 |
| F344 | `=ROUND(IF(AND(H325<>"",H326<>""),IF(E344<=1,1,E344),0),2)` | 0 |
| H344 | `=ROUND(IFERROR(H343/F344,0),2)` | 0 |
| K344 | `=ROUND(IFERROR(K343/F335,0),2)` | 0 |
| N344 | `=ROUND(IFERROR(N343/F334,0),2)` | 0 |
| Q344 | `=ROUND(IFERROR(Q343/F333,0),2)` | 0 |
| G347 | `=IF(OR(SAM!E419=0,SAM!E419=""),"",SAM!E419)` |  |
| E359 | `=IF(MONTH(Q351)=MONTH(Q352),((YEAR(Q352)-YEAR(Q351))*12)-12+(12-MONTH(Q351))+MONTH(Q352)-1+(EOMONTH(Q351,0)-Q351+1)/DAY(EOMONTH(Q351,0))+(1-(EOMONTH(Q352,0)-Q352)/DAY(EOMONTH(Q352,0))),((YEAR(Q352)-YEAR(Q351))*12)-12+(12-MONTH(Q351))+MONTH(Q352)-1+(EOMONTH(Q351,0)-Q351+1)/DAY(EOMONTH(Q351,0))+(1-(EOMONTH(Q352,0)-Q352)/DAY(EOMONTH(Q352,0))))` | 0.032258064516129004 |
| F359 | `=ROUND(IF(AND(Q351<>"",Q352<>""),IF(E359<=1,1,E359),0),2)` | 0 |
| E360 | `=IF(MONTH(N351)=MONTH(N352),((YEAR(N352)-YEAR(N351))*12)-12+(12-MONTH(N351))+MONTH(N352)-1+(EOMONTH(N351,0)-N351+1)/DAY(EOMONTH(N351,0))+(1-(EOMONTH(N352,0)-N352)/DAY(EOMONTH(N352,0))),((YEAR(N352)-YEAR(N351))*12)-12+(12-MONTH(N351))+MONTH(N352)-1+(EOMONTH(N351,0)-N351+1)/DAY(EOMONTH(N351,0))+(1-(EOMONTH(N352,0)-N352)/DAY(EOMONTH(N352,0))))` | 0.032258064516129004 |
| F360 | `=ROUND(IF(AND(N351<>"",N352<>""),IF(E360<=1,1,E360),0),2)` | 0 |
| E361 | `=IF(MONTH(K351)=MONTH(K352),((YEAR(K352)-YEAR(K351))*12)-12+(12-MONTH(K351))+MONTH(K352)-1+(EOMONTH(K351,0)-K351+1)/DAY(EOMONTH(K351,0))+(1-(EOMONTH(K352,0)-K352)/DAY(EOMONTH(K352,0))),((YEAR(K352)-YEAR(K351))*12)-12+(12-MONTH(K351))+MONTH(K352)-1+(EOMONTH(K351,0)-K351+1)/DAY(EOMONTH(K351,0))+(1-(EOMONTH(K352,0)-K352)/DAY(EOMONTH(K352,0))))` | 0.032258064516129004 |
| F361 | `=ROUND(IF(AND(K351<>"",K352<>""),IF(E361<=1,1,E361),0),2)` | 0 |
| H363 | `=IFERROR(SUM(H357:H361)-H355-H356+H354,0)` | 0 |
| K363 | `=IFERROR(SUM(K357:K361)-K355-K356+K354,0)` | 0 |
| N363 | `=IFERROR(SUM(N357:N361)-N355-N356+N354,0)` | 0 |
| Q363 | `=IFERROR(SUM(Q357:Q361)-Q355-Q356+Q354,0)` | 0 |
| H365 | `=ROUND(IFERROR(H363*H364,0),2)` | 0 |
| K365 | `=ROUND(IFERROR(K363*K364,0),2)` | 0 |
| N365 | `=ROUND(IFERROR(N363*N364,0),2)` | 0 |
| Q365 | `=ROUND(IFERROR(Q363*Q364,0),2)` | 0 |
| H369 | `=IFERROR(H365+H367,0)` | 0 |
| K369 | `=IFERROR(K365+K367,0)` | 0 |
| N369 | `=IFERROR(N365+N367,0)` | 0 |
| Q369 | `=IFERROR(Q365+Q367,0)` | 0 |
| E370 | `=IF(MONTH(H351)=MONTH(H352),((YEAR(H352)-YEAR(H351))*12)-12+(12-MONTH(H351))+MONTH(H352)-1+(EOMONTH(H351,0)-H351+1)/DAY(EOMONTH(H351,0))+(1-(EOMONTH(H352,0)-H352)/DAY(EOMONTH(H352,0))),((YEAR(H352)-YEAR(H351))*12)-12+(12-MONTH(H351))+MONTH(H352)-1+(EOMONTH(H351,0)-H351+1)/DAY(EOMONTH(H351,0))+(1-(EOMONTH(H352,0)-H352)/DAY(EOMONTH(H352,0))))` | 0.032258064516129004 |
| F370 | `=ROUND(IF(AND(H351<>"",H352<>""),IF(E370<=1,1,E370),0),2)` | 0 |
| H370 | `=ROUND(IFERROR(H369/F370,0),2)` | 0 |
| K370 | `=ROUND(IFERROR(K369/F361,0),2)` | 0 |
| N370 | `=ROUND(IFERROR(N369/F360,0),2)` | 0 |
| Q370 | `=ROUND(IFERROR(Q369/F359,0),2)` | 0 |

## Sheet: Help Document

### Detected sections

#### Schedule B: Interest and Ordinary Dividends from Self-Employment  (row 11)

#### Schedule C: Profit or Loss From Business (Sole Proprietorship)  (row 31)

| Line | Row | IRS / Label |
|---|---|---|
| 2023 | 74 | 65.5¢ |
| 2024 | 75 | 67.0¢ |
| 2025 | 76 | 70.0¢ |

#### Schedule D: Capital Gains and Losses  (row 103)

#### Schedule E: Supplemental Income and Loss  (row 123)

#### Schedule F: Profit or Loss From Farming  (row 143)

#### Partnership Cash Flow (Form 1065)  (row 177)

#### Form 1065: U.S. Return of Partnership Income  (row 220)

#### Partnerships report profit or loss on Form 1065. The partnership itself does not pay tax. Partnership profit (loss) is passed to individual partners via Schedule K-1 (Form 1065). The partners pay tax on their proportionate share.  (row 221)

#### Partnerships can be partners in other partnerships. Income earned by a partnership waterfalls to its partners.  (row 231)

#### S Corporation Cash Flow (Form 1120-S)  (row 278)

#### S Corporations prepare Schedule K-1 (Form 1120-S) to inform individual shareholders of their share of income (loss), deductions and credits.  (row 283)

#### Form 1120-S: U.S. Income Tax Return for an S Corporation  (row 313)

#### S Corporations report profit or loss on Form 1120-S. The S Corporation itself does not pay tax. S Corporation profit (loss) is passed to individual shareholders via Schedule K-1 (1120-S). The shareholders pay tax on their proportionate share.  (row 314)

#### Corporation Cash Flow (Form 1120)  (row 365)

#### Form 1120: U.S. Corporation Income Tax Return  (row 375)

#### Corporations report profit (loss) on Form 1120. They are taxed on their profits. Corporate profit (loss) is distributed to shareholders in the form of dividends.  (row 376)

### Formulas (0)

| Coord | Formula | Cached value |
|---|---|---|

## Sheet: Support

### Detected sections

### Formulas (0)

| Coord | Formula | Cached value |
|---|---|---|
