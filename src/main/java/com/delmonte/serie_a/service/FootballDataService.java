package com.delmonte.serie_a.service;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import tools.jackson.databind.node.ArrayNode;

import java.util.Optional;
import java.util.List;
import java.util.ArrayList;
import java.util.Arrays;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import jakarta.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.delmonte.serie_a.models.Team;
import com.delmonte.serie_a.repository.TeamRepo;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

@Service
public class FootballDataService {
    @Value("${FOOTBALL_DATA_API_KEY}")
    private String apiKey;
    
    @Value("${RAPIDAPI_KEYS:}")
    private String rapidApiRawKeys;
    
    @Value("${RAPIDAPI_HOST:api-football-v1.p.rapidapi.com}")
    private String rapidApiHost;
    
    @Value("${RAPIDAPI_LEAGUE_ID:55}")
    private String defaultLeagueId;
    
    private List<String> rapidApiKeys = new ArrayList<>();
    private int currentKeyIndex = 0;

    @PostConstruct
    public void init() {
        if (rapidApiRawKeys != null && !rapidApiRawKeys.isEmpty()) {
            // Pulizia chiavi: rimuovi spazi, righe vuote e virgole extra
            rapidApiKeys = Arrays.stream(rapidApiRawKeys.split(","))
                .map(String::trim)
                .filter(k -> !k.isEmpty())
                .toList();
            System.out.println("DEBUG: Sistema di rotazione pronto con " + rapidApiKeys.size() + " chiave/i valide.");
        }
    }
    
    @Autowired
    private TeamRepo teamRepo;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Mappatura codici Football-Data.org -> ID RapidAPI
    private String getRapidApiLeagueId(String competitionCode) {
        return switch (competitionCode) {
            case "SA" -> "55";  // Serie A (confermato dall'utente)
            case "PL" -> "39";  // Premier League
            case "BL1" -> "78"; // Bundesliga
            case "PD" -> "140"; // La Liga
            case "FL1" -> "61"; // Ligue 1
            default -> defaultLeagueId;
        };
    }

    public String getStandings(){
        String url = "https://api.football-data.org/v4/competitions/SA/standings";
        return callFootballDataApi(url);
    }

    public String getMatches(Integer season) {
        String url = "https://api.football-data.org/v4/competitions/SA/matches";
        if (season != null) {
            url += "?season=" + season;
        }
        return callFootballDataApi(url);
    }

    public String getScorers(){
        String url = "https://api.football-data.org/v4/competitions/SA/scorers";
        return callFootballDataApi(url);
    }
    
    public String getAllLeagues() {
        try {
            String url = "https://" + rapidApiHost + "/football-get-all-leagues";
            return callRapidApi(url);
        } catch (Exception e) {
            return "{\"error\": \"Failed to fetch leagues: " + e.getMessage() + "\"}";
        }
    }

    public String getMatchDetails(int matchId) {
        try {
            // 1. Info da Football-Data (per nomi squadre e data)
            String fdUrl = "https://api.football-data.org/v4/matches/" + matchId;
            String fdResponse = callFootballDataApi(fdUrl);
            JsonNode fdRoot = objectMapper.readTree(fdResponse);

            if (fdRoot.isMissingNode() || fdRoot.has("errorCode")) {
                return "{\"error\": \"Match non trovato su Football-Data\"}";
            }

            String homeTeam = fdRoot.path("homeTeam").path("shortName").asText(fdRoot.path("homeTeam").path("name").asText());
            String awayTeam = fdRoot.path("awayTeam").path("shortName").asText(fdRoot.path("awayTeam").path("name").asText());
            String utcDate = fdRoot.path("utcDate").asText();
            String date = utcDate.substring(0, 10);

            System.out.println("DEBUG: Cerco su RapidAPI: " + homeTeam + " vs " + awayTeam + " in data " + date);

            // 2. Cerco il match su RapidAPI usando la DATA (provando anche il giorno prima e dopo)
            String[] datesToTry = {date};
            String rapidResponse = null;
            boolean foundMatch = false;

            for (String d : datesToTry) {
                String rapidUrl = "https://" + rapidApiHost + "/football-get-matches-by-date?date=" + d;
                rapidResponse = callRapidApi(rapidUrl);
                try {
                    JsonNode res = objectMapper.readTree(rapidResponse);
                    if (res.has("response") && res.path("response").has("matches")) {
                        JsonNode matches = res.path("response").path("matches");
                        for (JsonNode m : matches) {
                            if (isSameMatch(homeTeam, awayTeam, m.path("home").path("name").asText(), m.path("away").path("name").asText())) {
                                foundMatch = true;
                                break;
                            }
                        }
                    }
                } catch (Exception e) {}
                if (foundMatch) break;
            }

            // Se la ricerca per data fallisce, provo con League ID 55 (Serie A) e 56 (Serie B)
            if (!foundMatch) {
                System.out.println("DEBUG: Ricerca per data fallita, provo fallback su leghe...");
                String[] leagues = {"55", "56", "57"}; // Serie A, Serie B, Coppa Italia
                for (String lid : leagues) {
                    String rapidUrl = "https://" + rapidApiHost + "/football-get-all-matches-by-league?leagueid=" + lid;
                    String leagueResponse = callRapidApi(rapidUrl);
                    try {
                        JsonNode res = objectMapper.readTree(leagueResponse);
                        JsonNode matchesNode = null;
                        if (res.has("response")) {
                            if (res.path("response").has("matches")) matchesNode = res.path("response").path("matches");
                            else if (res.path("response").has("scores")) matchesNode = res.path("response").path("scores");
                        }

                        if (matchesNode != null && matchesNode.isArray()) {
                            for (JsonNode m : matchesNode) {
                                String hName = "", aName = "";
                                if (m.has("home")) {
                                    hName = m.path("home").path("name").asText();
                                    aName = m.path("away").path("name").asText();
                                } else if (m.has("scores") && m.path("scores").isArray() && m.path("scores").size() >= 2) {
                                    hName = m.path("scores").get(0).path("name").asText();
                                    aName = m.path("scores").get(1).path("name").asText();
                                }

                                if (!hName.isEmpty() && isSameMatch(homeTeam, awayTeam, hName, aName)) {
                                    System.out.println("DEBUG: Match trovato con fallback! " + hName + " vs " + aName);
                                    ObjectNode found = objectMapper.createObjectNode();
                                    found.put("status", "success");
                                    ObjectNode resp = objectMapper.createObjectNode();
                                    tools.jackson.databind.node.ArrayNode arr = objectMapper.createArrayNode();
                                    arr.add(m);
                                    resp.set("matches", arr);
                                    found.set("response", resp);
                                    rapidResponse = found.toString();
                                    foundMatch = true;
                                    break;
                                }
                            }
                        }
                    } catch (Exception e) {}
                    if (foundMatch) break;
                }
            }

            // 3. Prepariamo la risposta combinata
            ObjectNode combinedResponse = objectMapper.createObjectNode();
            combinedResponse.set("footballData", fdRoot);
            
            // TENTATIVO DI RECUPERO MARCATORI ESTERNI (SCRAPING FALLBACK)
            if (!fdRoot.has("goals") || fdRoot.path("goals").size() == 0) {
                // Controllo se è uno 0-0 confermato
                JsonNode score = fdRoot.path("score").path("fullTime");
                if (score.has("home") && score.has("away") && 
                    score.path("home").asInt() == 0 && score.path("away").asInt() == 0) {
                    System.out.println("DEBUG: Match terminato 0-0. Salto scraping marcatori.");
                } else {
                    System.out.println("DEBUG: Marcatori assenti su API. Tento recupero esterno tramite scraping...");
                    try {
                        JsonNode fullScore = fdRoot.path("score").path("fullTime");
                        int hScore = fullScore.path("home").asInt(0);
                        int aScore = fullScore.path("away").asInt(0);
                        int matchday = fdRoot.path("matchday").asInt(0);
                        ObjectNode scrapedData = scrapeScorers(homeTeam, awayTeam, date, hScore, aScore, matchday);
                    if (scrapedData.has("goals")) {
                        ((ObjectNode)fdRoot).set("goals", scrapedData.get("goals"));
                    }
                    if (scrapedData.has("substitutions")) {
                        ((ObjectNode)fdRoot).set("substitutions", scrapedData.get("substitutions"));
                    }
                    if (scrapedData.has("cards")) {
                        ((ObjectNode)fdRoot).set("cards", scrapedData.get("cards"));
                    }
                    if (scrapedData.has("injuries")) {
                        ((ObjectNode)fdRoot).set("injuries", scrapedData.get("injuries"));
                    }
                        System.out.println("DEBUG: Recuperati dati extra tramite scraping!");
                    } catch (Exception e) {
                        System.err.println("Errore durante lo scraping: " + e.getMessage());
                    }
                }
            }
            
            try {
                if (rapidResponse != null && !rapidResponse.trim().isEmpty()) {
                    JsonNode rapidRoot = objectMapper.readTree(rapidResponse);
                    
                    if (rapidRoot.has("response") && !rapidRoot.path("response").isMissingNode()) {
                        JsonNode responseNode = rapidRoot.path("response");
                        if (responseNode.has("matches")) {
                            JsonNode matches = responseNode.path("matches");
                            if (matches.isArray() && matches.size() > 0) {
                                JsonNode firstMatch = matches.get(0);
                                if (firstMatch != null && !firstMatch.isMissingNode()) {
                                    String eventId = firstMatch.path("eventid").asText("");
                                    if (!eventId.isEmpty()) {
                                        try {
                                            String statsResponse = getMatchStatistics(eventId);
                                            JsonNode statsRoot = objectMapper.readTree(statsResponse);
                                            combinedResponse.set("rapidApiDetails", statsRoot);
                                        } catch (Exception e) {
                                            combinedResponse.put("rapidApiDetailsError", "Errore recupero dettagli: " + e.getMessage());
                                        }
                                    }
                                }
                            }
                        }
                    }
                    combinedResponse.set("rapidApi", rapidRoot);
                } else {
                    combinedResponse.set("rapidApi", null);
                }
            } catch (Exception e) {
                combinedResponse.put("rapidApiError", "Errore parsing RapidAPI: " + e.getMessage());
            }

            return combinedResponse.toString();

        } catch (Exception e) {
            return "{\"error\": \"Errore ricerca match: " + e.getMessage() + "\"}";
        }
    }

    public String getMatchStatistics(String eventId) {
        String url = "https://" + rapidApiHost + "/football-get-match-event-all-stats?eventid=" + eventId;
        return callRapidApi(url);
    }

    public String getExternalMatchDetails(String externalMatchId) {
        String url = "https://" + rapidApiHost + "/football-get-match-event-all-stats?eventid=" + externalMatchId;
        return callRapidApi(url);
    }

    private ObjectNode scrapeScorers(String home, String away, String date, int expectedHome, int expectedAway, int matchday) {
        ObjectNode result = objectMapper.createObjectNode();
        ArrayNode goals = objectMapper.createArrayNode();
        ArrayNode substitutions = objectMapper.createArrayNode();
        ArrayNode cards = objectMapper.createArrayNode();
        ArrayNode injuries = objectMapper.createArrayNode();
        
        int foundHome = 0;
        int foundAway = 0;
        java.util.Set<String> processed = new java.util.HashSet<>();

        try {
            // Tentativo 1: Costruzione diretta URL Sky Sport
            String year = date.substring(0, 4);
            String skyHome = simplifyForUrl(home);
            String skyAway = simplifyForUrl(away);
            String directUrl = String.format("https://sport.sky.it/calcio/serie-a/partite/%s/giornata-%d/%s-%s/tabellino-statistiche", 
                                            year, matchday, skyHome, skyAway);
            
            System.out.println("DEBUG: [SCRAPE] Tento URL diretto Sky: " + directUrl);
            try {
                Document doc = Jsoup.connect(directUrl)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
                    .timeout(8000)
                    .get();
                
                String fullText = doc.text();
                // Debug per vedere cosa legge effettivamente nella pagina
                System.out.println("DEBUG: [SCRAPE] Lunghezza testo pagina: " + fullText.length());
                
                processPageContent(fullText, home, away, expectedHome, expectedAway, goals, cards, substitutions, processed);
                if (goals.size() >= (expectedHome + expectedAway)) {
                    System.out.println("DEBUG: [SCRAPE] Dati trovati con URL diretto!");
                    return buildResult(goals, substitutions, cards, injuries);
                }
            } catch (Exception e) {
                System.out.println("DEBUG: [SCRAPE] URL diretto fallito o non trovato.");
            }

            // Tentativo 2: Ricerca motori di ricerca
            String query = "tabellino " + home + " " + away + " " + date + " site:sport.sky.it";
            String searchUrl = "https://html.duckduckgo.com/html/?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8);
            
            System.out.println("DEBUG: [SCRAPE] Ricerca su motori per: " + home + "-" + away);
            Document searchDoc = Jsoup.connect(searchUrl)
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
                .header("Accept-Language", "it-IT,it;q=0.9")
                .timeout(15000)
                .get();

            Elements searchResults = searchDoc.select(".result__a");
            if (searchResults.isEmpty()) {
                System.out.println("DEBUG: [SCRAPE] DuckDuckGo vuoto, provo Google...");
                String googleUrl = "https://www.google.com/search?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8);
                searchDoc = Jsoup.connect(googleUrl)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36")
                    .get();
                searchResults = searchDoc.select("a"); 
            }

            for (Element link : searchResults) {
                String href = link.attr("href");
                if (href.contains("sport.sky.it") && href.contains("tabellino")) {
                    if (href.startsWith("/url?q=")) href = href.substring(7).split("&")[0];
                    System.out.println("DEBUG: [SCRAPE] Trovato link promettente: " + href);
                    try {
                        Document pageDoc = Jsoup.connect(href).userAgent("Mozilla/5.0").get();
                        processPageContent(pageDoc.text(), home, away, expectedHome, expectedAway, goals, cards, substitutions, processed);
                        if (goals.size() >= (expectedHome + expectedAway)) break;
                    } catch (Exception e) {}
                }
            }
        } catch (Exception e) {
            System.err.println("DEBUG: [SCRAPE] Errore generale: " + e.getMessage());
        }
        
        return buildResult(goals, substitutions, cards, injuries);
    }

    private String simplifyForUrl(String name) {
        if (name == null) return "";
        String s = name.toLowerCase();
        if (s.contains("sassuolo")) return "sassuolo";
        if (s.contains("napoli")) return "napoli";
        if (s.contains("milan")) return "milan";
        if (s.contains("cremonese")) return "cremonese";
        if (s.contains("juve")) return "juventus";
        if (s.contains("inter")) return "inter";
        return s.replace(" ", "-").replaceAll("[^a-z-]", "");
    }

    private ObjectNode buildResult(ArrayNode goals, ArrayNode substitutions, ArrayNode cards, ArrayNode injuries) {
        ObjectNode result = objectMapper.createObjectNode();
        result.set("goals", goals);
        result.set("substitutions", substitutions);
        result.set("cards", cards);
        result.set("injuries", injuries);
        return result;
    }

    private void processPageContent(String content, String home, String away, int expH, int expA, ArrayNode goals, ArrayNode cards, ArrayNode subs, java.util.Set<String> processed) {
        // Pattern flessibili per catturare diversi formati di tabellini
        // 1. Formato: 17' McTominay o McTominay 17'
        java.util.regex.Pattern p1 = java.util.regex.Pattern.compile("(\\d+)'\\s*([A-Z][a-zà-ú']+(?:\\s+[A-Z][a-zà-ú']+)*)");
        java.util.regex.Pattern p2 = java.util.regex.Pattern.compile("([A-Z][a-zà-ú']+(?:\\s+[A-Z][a-zà-ú']+)*)\\s*(\\d+)'");
        // 2. Formato con parole chiave (GOL, ammonizione, etc)
        java.util.regex.Pattern p3 = java.util.regex.Pattern.compile("(?:GOL|gol|rete|segna|ammonizione|espulsione|sostituzione).*?(\\d+)'\\s*([A-Z][a-zà-ú']+(?:\\s+[A-Z][a-zà-ú']+)*)");

        int fH = 0, fA = 0;

        // Estrazione Gol (Pattern 1)
        java.util.regex.Matcher m1 = p1.matcher(content);
        while (m1.find() && (fH < expH || fA < expA)) {
            processMatch(m1, 2, 1, content, home, away, expH, expA, goals, cards, subs, processed);
            // Aggiorno contatori locali per il loop
            fH = 0; fA = 0;
            for (int i=0; i<goals.size(); i++) if (goals.get(i).path("team").path("name").asText().equals(home)) fH++; else fA++;
        }

        // Estrazione Gol (Pattern 2)
        java.util.regex.Matcher m2 = p2.matcher(content);
        while (m2.find() && (fH < expH || fA < expA)) {
            processMatch(m2, 1, 2, content, home, away, expH, expA, goals, cards, subs, processed);
            fH = 0; fA = 0;
            for (int i=0; i<goals.size(); i++) if (goals.get(i).path("team").path("name").asText().equals(home)) fH++; else fA++;
        }

        // Estrazione Gol (Pattern 3)
        java.util.regex.Matcher m3 = p3.matcher(content);
        while (m3.find() && (fH < expH || fA < expA)) {
            processMatch(m3, 2, 1, content, home, away, expH, expA, goals, cards, subs, processed);
            fH = 0; fA = 0;
            for (int i=0; i<goals.size(); i++) if (goals.get(i).path("team").path("name").asText().equals(home)) fH++; else fA++;
        }
    }

    private void processMatch(java.util.regex.Matcher m, int nameIdx, int minIdx, String content, String home, String away, int expH, int expA, ArrayNode goals, ArrayNode cards, ArrayNode subs, java.util.Set<String> processed) {
        String pName = m.group(nameIdx).trim();
        int min = Integer.parseInt(m.group(minIdx));
        String fullMatch = m.group(0).toLowerCase();

        if (!isValidPlayer(pName, home, away)) return;

        int fH = 0, fA = 0;
        for (int i=0; i<goals.size(); i++) if (goals.get(i).path("team").path("name").asText().equals(home)) fH++; else fA++;

        String team = determineTeam(pName, content, m.start(), home, away, fH, expH, fA, expA);
        if (team == null) return;

        if (fullMatch.contains("gol") || fullMatch.contains("rete") || fullMatch.contains("segna") || (!fullMatch.contains("ammonizione") && !fullMatch.contains("sostituzione"))) {
            if ((team.equals(home) && fH < expH) || (team.equals(away) && fA < expA)) {
                if (processed.add("goal_" + pName + "_" + min)) {
                    addGoal(goals, min, pName, team, fullMatch.contains("autorete") ? "OG" : "GOAL");
                }
            }
        } else if (fullMatch.contains("ammonizione") || fullMatch.contains("espulsione") || fullMatch.contains("rosso") || fullMatch.contains("giallo")) {
            if (processed.add("card_" + pName + "_" + min)) {
                addCard(cards, min, pName, team, fullMatch.contains("rosso") ? "RED" : "YELLOW");
            }
        }
    }

    private boolean isValidPlayer(String name, String home, String away) {
        String n = name.toLowerCase();
        return n.length() >= 3 && !n.contains("voti") && !n.contains("pagelle") && 
               !n.contains("cronaca") && !checkName(home, name) && !checkName(away, name);
    }

    private String determineTeam(String player, String content, int matchStart, String home, String away, int fH, int eH, int fA, int eA) {
        String snippet = content.substring(Math.max(0, matchStart - 100), Math.min(content.length(), matchStart + 100)).toLowerCase();
        String sHome = simplify(home);
        String sAway = simplify(away);

        // Sky usa spesso frasi come "Napoli avanti" o "Gol Napoli" prima del marcatore
        if (snippet.contains(sHome + " avanti") || snippet.contains("gol " + sHome) || snippet.contains(sHome + " in vantaggio")) return home;
        if (snippet.contains(sAway + " avanti") || snippet.contains("gol " + sAway) || snippet.contains(sAway + " in vantaggio")) return away;

        // Fallback su ricerca nomi squadra
        int hPos = snippet.lastIndexOf(sHome);
        int aPos = snippet.lastIndexOf(sAway);

        if (hPos != -1 && (aPos == -1 || hPos > aPos)) return fH < eH ? home : null;
        if (aPos != -1 && (hPos == -1 || aPos > hPos)) return fA < eA ? away : null;

        return fH < eH ? home : (fA < eA ? away : null);
    }

    private void addGoal(ArrayNode goals, int minute, String playerName, String teamName, String type) {
        ObjectNode goal = objectMapper.createObjectNode();
        goal.put("minute", minute);
        goal.put("type", type);
        ObjectNode player = objectMapper.createObjectNode();
        player.put("name", playerName);
        goal.set("player", player);
        ObjectNode team = objectMapper.createObjectNode();
        team.put("name", teamName);
        goal.set("team", team);
        goals.add(goal);
    }

    private void addCard(ArrayNode cards, int minute, String playerName, String teamName, String type) {
        ObjectNode card = objectMapper.createObjectNode();
        card.put("minute", minute);
        card.put("type", type); // YELLOW, RED
        ObjectNode player = objectMapper.createObjectNode();
        player.put("name", playerName);
        card.set("player", player);
        ObjectNode team = objectMapper.createObjectNode();
        team.put("name", teamName);
        card.set("team", team);
        cards.add(card);
    }

    private void addSubstitution(ArrayNode subs, int minute, String playerIn, String playerOut, String teamName) {
        ObjectNode sub = objectMapper.createObjectNode();
        sub.put("minute", minute);
        ObjectNode team = objectMapper.createObjectNode();
        team.put("name", teamName);
        sub.set("team", team);
        ObjectNode pOut = objectMapper.createObjectNode();
        pOut.put("name", playerOut);
        sub.set("playerOut", pOut);
        ObjectNode pIn = objectMapper.createObjectNode();
        pIn.put("name", playerIn);
        sub.set("playerIn", pIn);
        subs.add(sub);
    }

    private void addInjury(ArrayNode injuries, int minute, String playerName, String teamName) {
        ObjectNode injury = objectMapper.createObjectNode();
        injury.put("minute", minute);
        ObjectNode player = objectMapper.createObjectNode();
        player.put("name", playerName);
        injury.set("player", player);
        ObjectNode team = objectMapper.createObjectNode();
        team.put("name", teamName);
        injury.set("team", team);
        injuries.add(injury);
    }

    private boolean isSameMatch(String fdHome, String fdAway, String sHome, String sAway) {
        return (checkName(fdHome, sHome) && checkName(fdAway, sAway)) || 
               (checkName(fdHome, sAway) && checkName(fdAway, sHome));
    }

    private boolean checkName(String fdName, String sName) {
        if (fdName == null || sName == null) return false;
        String n1 = simplify(fdName);
        String n2 = simplify(sName);
        // Scartiamo solo se il nome trovato è esattamente il nome della squadra semplificato
        return n1.equals(n2);
    }

    private String simplify(String name) {
        if (name == null) return "";
        String s = name.toLowerCase();
        if (s.contains("sassuolo")) return "sassuolo";
        if (s.contains("napoli")) return "napoli";
        if (s.contains("milan")) return "milan";
        if (s.contains("inter")) return "inter";
        if (s.contains("juve")) return "juventus";
        if (s.contains("roma")) return "roma";
        if (s.contains("lazio")) return "lazio";
        if (s.contains("cremonese")) return "cremonese";
        if (s.contains("parma")) return "parma";
        
        return s.replace("internazionale milano", "inter")
                .replace("ss c napoli", "napoli")
                .replace("fc", "")
                .replace("ac", "")
                .replace("as", "")
                .replace("ssc", "")
                .replace("us", "")
                .replace(" ", "")
                .trim();
    }

    private String callRapidApi(String url) {
        if (rapidApiKeys.isEmpty()) {
            return "{\"error\": \"Nessuna chiave RapidAPI configurata\"}";
        }

        int attempts = 0;
        while (attempts < rapidApiKeys.size()) {
            String currentKey = rapidApiKeys.get(currentKeyIndex).trim();
            HttpHeaders headers = new HttpHeaders();
            headers.set("x-rapidapi-key", currentKey);
            headers.set("x-rapidapi-host", rapidApiHost);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            try {
                System.out.println("DEBUG: Tento chiamata con chiave #" + (currentKeyIndex + 1));
                ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
                String body = response.getBody();

                if (body != null && (body.contains("\"message\":\"You are not subscribed to this API\"") || 
                             body.contains("Too Many Requests") || 
                             body.contains("Request Failed Please try Again"))) {
                    System.err.println("ATTENZIONE: Chiave #" + (currentKeyIndex + 1) + " non autorizzata, esaurita o errore temporaneo. Ruoto...");
                    currentKeyIndex = (currentKeyIndex + 1) % rapidApiKeys.size();
                    attempts++;
                    continue;
                }

                if (body != null && body.contains("\"status\":\"failed\"")) {
                    System.err.println("AVVISO: Chiave #" + (currentKeyIndex + 1) + " errore logico persistente: " + body);
                    return body;
                }

                System.out.println("DEBUG: Chiamata riuscita con Chiave #" + (currentKeyIndex + 1));
                return body;
            } catch (Exception e) {
                String error = e.getMessage();
                if (error != null && (error.contains("429") || error.contains("403") || error.contains("Too Many Requests"))) {
                    System.err.println("ATTENZIONE: Chiave #" + (currentKeyIndex + 1) + " esaurita o non disponibile. Ruoto...");
                    currentKeyIndex = (currentKeyIndex + 1) % rapidApiKeys.size();
                    attempts++;
                } else {
                    return "{\"error\": \"RapidAPI call failed: " + error + "\"}";
                }
            }
        }
        return "{\"error\": \"Tutte le chiavi API sono state esaurite (429)\"}";
    }

    private String callFootballDataApi(String url) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Auth-Token", apiKey);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            return response.getBody();
        } catch (Exception e) {
            String safeError = e.getMessage().replace("\"", "'").replace("\n", " ");
            return "{\"error\": \"Football-Data API call failed: " + safeError + "\"}";
        }
    }

    public boolean checkSyncStatus(){
        try{
            String jsonResponse = getStandings();
            JsonNode root = objectMapper.readTree(jsonResponse);
            JsonNode standings = root.path("standings").get(0).path("table");
            for(JsonNode row : standings){
                String teamName = row.path("team").path("shortName").asText();
                int apiPoints = row.path("points").asInt();
                
                Optional<Team> teamOpt = teamRepo.findAll().stream()
                    .filter(t -> t.getName() != null && (
                        t.getName().equalsIgnoreCase(teamName) || 
                        teamName.contains(t.getName()) || 
                        t.getName().contains(teamName)
                    ))
                    .findFirst();

                if(teamOpt.isPresent()){
                    if (teamOpt.get().getPoints() != apiPoints) {
                        return false;
                    }
                }
            }
            return true;
        }catch(Exception e){
            return true;
        }
    }

    public String updateStandings(){
        try{
            String jsonResponse = getStandings();
            JsonNode root = objectMapper.readTree(jsonResponse);
            JsonNode standings = root.path("standings").get(0).path("table");
            int count = 0;
            for(JsonNode row : standings){
                String teamName = row.path("team").path("shortName").asText();
                int points = row.path("points").asInt();
                String logoUrl=row.path("team").path("crest").asText();
                
                Optional<Team> teamOpt = teamRepo.findAll().stream()
                    .filter(t -> t.getName() != null && (
                        t.getName().equalsIgnoreCase(teamName) || 
                        teamName.contains(t.getName()) || 
                        t.getName().contains(teamName)
                    ))
                    .findFirst();

                if(teamOpt.isPresent()){
                    Team team = teamOpt.get();
                    team.setPoints(points);
                    team.setLogoUrl(logoUrl);
                    teamRepo.save(team);
                    count++;
                }
            }
            return "Aggiornamento completato. Aggiornati " + count + " team.";
        }catch(Exception e){
            return "Errore durante l'aggiornamento: " + e.getMessage();
        }
    }
}
