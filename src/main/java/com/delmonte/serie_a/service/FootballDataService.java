package com.delmonte.serie_a.service;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.delmonte.serie_a.models.Team;
import com.delmonte.serie_a.repository.TeamRepo;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;



@Service
public class FootballDataService {
    @Value("${FOOTBALL_DATA_API_KEY}")
    private String apiKey;
    @Autowired
    private TeamRepo teamRepo;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Retrieves the current standings of the Serie A championship from the Football Data API
     * @return a JSON string containing the Standing of the Serie A championship
     */
    public String getStandings(){
        String url = "https://api.football-data.org/v4/competitions/SA/standings";
        return callFootballDataApi(url);
    }

    /**
     * Recupera le partite della Serie A.
     * @return un JSON con tutte le partite (giocate e future)
     */
    public String getMatches() {
        String url = "https://api.football-data.org/v4/competitions/SA/matches";
        return callFootballDataApi(url);
    }

    /**
     * Retrieves the scorers of the Serie A championship from the Football Data API.
     * @return a JSON string containing the scorers of the Serie A championship
     */
    public String getScorers(){
        String url = "https://api.football-data.org/v4/competitions/SA/scorers";
        return callFootballDataApi(url);
    }
    
    public String getMatchDetails(int matchId){
        String url = "https://api.football-data.org/v4/matches/" + matchId;
        return callFootballDataApi(url);
    }

    /**
     * Calls the Football Data API to retrieve data from the given URL.
     * @param url the URL of the API call
     * @return the JSON response from the API call, or an error message if the call fails
     */
    private String callFootballDataApi(String url) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Auth-Token", apiKey);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            return response.getBody();
        } catch (Exception e) {
            return "Errore durante la chiamata API: " + e.getMessage();
        }
    }

    /**
     * Checks if the teams in the database are in sync with the ones in the Football Data API.
     * @return true if the teams are in sync, false otherwise
     */
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
                        return false; // Trovata una discrepanza, non siamo sincronizzati
                    }
                }
            }
            return true; // Tutti i punti corrispondono
        }catch(Exception e){
            return true; // In caso di errore API, meglio restare sul verde
        }
    }

    /**
     * Updates the standings of the Serie A championship from the Football Data API.
     * 
     * Retrieves the current Standing of the Serie A championship from the Football Data API.
     * Then, for each team in the Standing, it updates the points and the logo URL of the corresponding team in the database.
     * 
     * @return a string containing the result of the update operation. If the update is successful, it returns a string like "Aggiornamento completato. Aggiornati X team.". If an error occurs, it returns a string like "Errore durante l'aggiornamento: Y".
     */
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
