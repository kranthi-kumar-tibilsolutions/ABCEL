# Full API test suite — run from d:\ABCEL
$BASE = "http://localhost:3001"
$PASS = 0; $FAIL = 0; $WARN = 0

function Test-Endpoint {
    param($Method, $Path, $Body, $Label, $ExpectFields)
    $url = "$BASE$Path"
    try {
        $params = @{ Uri=$url; Method=$Method; ErrorAction="Stop" }
        if ($Body) { $params["Body"] = ($Body | ConvertTo-Json -Compress); $params["ContentType"] = "application/json" }
        $r = Invoke-RestMethod @params
        $ok = $true
        if ($ExpectFields) {
            foreach ($f in $ExpectFields) {
                $val = $r
                foreach ($p in $f.Split('.')) { $val = $val.$p }
                if ($null -eq $val) { $ok = $false; Write-Host "  WARN  [$Label] field '$f' is null" -ForegroundColor Yellow; $script:WARN++ }
            }
        }
        if ($ok) { Write-Host "  PASS  [$Label]" -ForegroundColor Green; $script:PASS++ }
        return $r
    } catch {
        $msg = $_.Exception.Message -replace "`n"," "
        Write-Host "  FAIL  [$Label] $msg" -ForegroundColor Red; $script:FAIL++
        return $null
    }
}

Write-Host "`n======= DATA ROUTES =======" -ForegroundColor Cyan
Test-Endpoint GET  "/api/status"     $null "GET /status"     @("ready")
Test-Endpoint GET  "/api/meta"       $null "GET /meta"       @("group_avg","top_business","lowest_business","total_respondents","total_units")
$biz = Test-Endpoint GET  "/api/businesses" $null "GET /businesses" @()
if ($biz) { if ($biz.Count -gt 0) { Write-Host "       businesses: $($biz.Count) items, first=$($biz[0].name)" -ForegroundColor DarkGray } }
$units = Test-Endpoint GET  "/api/units"      $null "GET /units"      @()
if ($units) { Write-Host "       units: $($units.Count)" -ForegroundColor DarkGray }
$clusters = Test-Endpoint GET  "/api/clusters"   $null "GET /clusters"   @()
$cohorts  = Test-Endpoint GET  "/api/cohorts"    $null "GET /cohorts"    @()
Test-Endpoint GET  "/api/units?business=Birla Carbon" $null "GET /units?business=" @()
Test-Endpoint POST "/api/load-sample" $null "POST /load-sample" @("success","copied")
Test-Endpoint POST "/api/reset"       $null "POST /reset"       @("success")
# reload sample after reset
Test-Endpoint POST "/api/load-sample" $null "POST /load-sample (reload)" @("success")

Write-Host "`n======= AI ROUTES =======" -ForegroundColor Cyan
$summary = Test-Endpoint POST "/api/summary" @{dimension="Business Unit"} "POST /summary" @("bullets")
if ($summary) { Write-Host "       bullets[0]: $($summary.bullets[0])" -ForegroundColor DarkGray }

$insights = Test-Endpoint POST "/api/insights" @{} "POST /insights" @("topTrends","outliers")
if ($insights) { Write-Host "       topTrends[0]: $($insights.topTrends[0].text)" -ForegroundColor DarkGray }

$bizInsight = Test-Endpoint POST "/api/business-insight" @{name="Birla Carbon"; overall=4.45; band="strong"} "POST /business-insight" @("insight")

Test-Endpoint POST "/api/focus-areas" @{} "POST /focus-areas" @("areas")

# Chat — streaming, just check it returns 200
Write-Host "  TEST  [POST /chat (streaming)]" -ForegroundColor DarkGray
try {
    $chatBody = '{"messages":[{"role":"user","content":"What is the overall engagement score?"}]}'
    $req = [System.Net.WebRequest]::Create("$BASE/api/chat")
    $req.Method = "POST"; $req.ContentType = "application/json"
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($chatBody)
    $req.ContentLength = $bytes.Length
    $s = $req.GetRequestStream(); $s.Write($bytes,0,$bytes.Length); $s.Close()
    $resp = $req.GetResponse()
    $code = [int]$resp.StatusCode
    $stream = $resp.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $first = ""; $lines = 0
    while (-not $reader.EndOfStream -and $lines -lt 5) { $line = $reader.ReadLine(); if ($line) { $first += $line; $lines++ } }
    $reader.Close(); $resp.Close()
    if ($code -eq 200) { Write-Host "  PASS  [POST /chat (streaming)] first=$($first.Substring(0,[Math]::Min(80,$first.Length)))" -ForegroundColor Green; $script:PASS++ }
    else { Write-Host "  FAIL  [POST /chat] HTTP $code" -ForegroundColor Red; $script:FAIL++ }
} catch { Write-Host "  FAIL  [POST /chat] $($_.Exception.Message)" -ForegroundColor Red; $script:FAIL++ }

Write-Host "`n======= SENTIMENT ROUTES =======" -ForegroundColor Cyan
Test-Endpoint GET  "/api/sentiment/overview"              $null "GET /sentiment/overview"   @("total","distribution")
Test-Endpoint GET  "/api/sentiment/over-time"             $null "GET /sentiment/over-time"  @("trend","granularity")
Test-Endpoint GET  "/api/sentiment/samples"               $null "GET /sentiment/samples"    @("samples","total")
Test-Endpoint GET  "/api/sentiment/samples?label=Positive" $null "GET /sentiment/samples?label" @()
Test-Endpoint GET  "/api/sentiment/validate-statistical"  $null "GET /sentiment/validate"   @()

Write-Host "`n======= STATISTICAL ROUTES =======" -ForegroundColor Cyan
$qs = Test-Endpoint GET "/api/statistical/questions" $null "GET /statistical/questions" @("questions")
if ($qs) {
    $q0 = $qs.questions[0].id
    Write-Host "       first question: $q0" -ForegroundColor DarkGray
    Test-Endpoint GET "/api/statistical/correlations/$q0"              $null "GET /correlations/$q0"    @("correlations","n")
    Test-Endpoint GET "/api/statistical/correlations/$q0?limit=5"      $null "GET /correlations?limit=5" @("correlations")
    Test-Endpoint GET "/api/statistical/correlogram/$q0"               $null "GET /correlogram/$q0"     @("matrix","question_ids")
    Test-Endpoint GET "/api/statistical/network/$q0"                   $null "GET /network/$q0"         @("nodes","edges")
    Test-Endpoint GET "/api/statistical/insights/$q0"                  $null "GET /insights/$q0"        @("insight")
}

Write-Host "`n======= PERSONA ROUTES =======" -ForegroundColor Cyan
Test-Endpoint GET "/api/persona/dimensions"  $null "GET /persona/dimensions" @("dimensions")
Test-Endpoint GET "/api/persona/top5"        $null "GET /persona/top5"       @("personas")
Test-Endpoint GET "/api/persona/cohorts"     $null "GET /persona/cohorts"    @("cohorts")
$pQuery = Test-Endpoint POST "/api/persona/query" @{
    filters=@(@{dimension="generation";operator="eq";value="Gen Z"})
    comparison_cohorts=@("gen_y","managers")
    persona_name="Gen Z Test"
} "POST /persona/query" @("persona_n","themes")
if ($pQuery) { Write-Host "       persona_n=$($pQuery.persona_n) themes=$($pQuery.themes.Count)" -ForegroundColor DarkGray }

$saved = Test-Endpoint POST "/api/persona/save" @{
    persona_name="Test Persona"; filters=@(); persona_n=100; scores=@{}
} "POST /persona/save" @("success","id")

Test-Endpoint POST "/api/persona/takeaways" @{
    persona_name="Gen Z"; themes=@(@{theme="Engagement";persona_score=3.8;overall_score=4.0;delta_overall=-0.2;significant=$true}); persona_n=500
} "POST /persona/takeaways" @("takeaways")

Write-Host "`n======= HYPOTHESIS ROUTES =======" -ForegroundColor Cyan
Test-Endpoint GET  "/api/hypothesis/templates"  $null "GET /hypothesis/templates" @("templates")
Test-Endpoint GET  "/api/hypothesis/history"    $null "GET /hypothesis/history"   @("total","items")
$hyp = Test-Endpoint POST "/api/hypothesis/test" @{
    hypothesis_text="Gen Z employees have higher Engagement scores than the company average."
    filters=@{}; alpha=0.05
} "POST /hypothesis/test" @("success")
if ($hyp -and $hyp.success) {
    Write-Host "       verdict=$($hyp.result.verdict) z=$($hyp.result.z) p=$($hyp.result.p_value)" -ForegroundColor DarkGray
    $hid = Test-Endpoint GET "/api/hypothesis/history" $null "GET /history after test" @("total")
    if ($hid -and $hid.items.Count -gt 0) {
        $itemId = $hid.items[0].id
        Test-Endpoint GET    "/api/hypothesis/history/$itemId" $null "GET /history/:id"    @("id","verdict")
        Test-Endpoint DELETE "/api/hypothesis/history/$itemId" $null "DELETE /history/:id" @("success")
    }
}

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "  PASSED: $PASS   FAILED: $FAIL   WARNINGS: $WARN" -ForegroundColor White
Write-Host "======================================`n" -ForegroundColor Cyan
