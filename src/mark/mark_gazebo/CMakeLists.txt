cmake_minimum_required(VERSION 3.5)
project(mark_gazebo)

add_compile_options(-std=c++17)

find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(urdf REQUIRED)
find_package(mark REQUIRED)
find_package(mark_msgs REQUIRED)
find_package(gazebo_ros2_control REQUIRED)
find_package(gazebo_ros REQUIRED)

set(dependencies
  rclcpp
  urdf
  mark
  mark_msgs
  gazebo_ros2_control
  gazebo_ros
)

install(PROGRAMS
  scripts/imu_sensor.py
  scripts/odometry_tf.py
  scripts/odometry.py
  DESTINATION bin
)

include_directories(
  include
  ${mark_INCLUDE_DIRS}
  ${mark_INCLUDE_DIRS}/mark/
  ${mark_INCLUDE_DIRS}/mark/mark/
  ${GAZEBO_INCLUDE_DIRS}
)

add_executable(contact_sensor src/contact_sensor.cpp)
target_link_libraries(contact_sensor ${GAZEBO_LIBRARIES})
ament_target_dependencies(contact_sensor ${dependencies})

install(TARGETS 
  contact_sensor
    DESTINATION lib/${PROJECT_NAME}
)
install(DIRECTORY launch DESTINATION share/${PROJECT_NAME})
install(DIRECTORY config DESTINATION share/${PROJECT_NAME})
install(DIRECTORY worlds DESTINATION share/${PROJECT_NAME})

ament_export_include_directories(include)
ament_export_dependencies(${dependencies})

ament_package()
