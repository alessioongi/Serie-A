package com.delmonte.serie_a.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.delmonte.serie_a.models.Team;
import com.delmonte.serie_a.repository.TeamRepo;

@Service
public class TeamServiceImpl implements TeamService {
    @Autowired
    private TeamRepo teamRepo;

/**
 * Retrieve all teams in the database.
 * @return a list of all teams in the database.
 */
/*******  cdec33ee-f82d-453d-ac2c-ef878086919b  *******/    
    @Override
    public List<Team> getAll() {
        return teamRepo.findAll();
    }
}
