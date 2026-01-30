package com.delmonte.serie_a.service;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class FootballDataService {
    @Value("${FOOTBALL_DATA_API_KEY}")
    private String apiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    public String getStandings(){
        String url = "https://api.football-data.org/v4/competitions/SA/standings";
        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Auth-Token", apiKey);

        HttpEntity<String> entity = new HttpEntity<>(headers);

        try{
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            return response.getBody();
        }catch(Exception e){
            return "Errore durante la chiamata API: " + e.getMessage();
        }
      
    }
}
