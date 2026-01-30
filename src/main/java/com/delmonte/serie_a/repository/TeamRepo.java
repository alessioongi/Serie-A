package com.delmonte.serie_a.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.delmonte.serie_a.models.Team;

@Repository
public interface TeamRepo extends JpaRepository<Team,Integer> {

}
